// js/modules/booking.js · pages/booking.html?functionId=<id>
//
// Fase 14: resumen de la función (getFunctionContext).
// Fase 15: mapa de sillas con <cinema-seat>.
// Fase 16: selección real -> array selectedSeats, cantidad de tickets, resumen
//          en vivo, validaciones y botón Reservar (re-chequea disponibilidad).
// Fase 17: "Confirmar reserva" creará la reserva y bloqueará las butacas.

import "../components/site-header.js";
import "../components/site-footer.js";
import "../components/cinema-seat.js";

import { isLoggedIn, requireAuth } from "./auth.js";
import { getFunctionContext, checkSeatsAvailable } from "./seats.js";
import { createReservation } from "./reservations.js";
import { $ } from "../utils/dom.js";
import { setError } from "../ui/states.js";
import { formatMoney, dateOptionLabel, sitePath } from "../utils/helpers.js";

const MAX_SEATS = 8;
const LOCATION_ES = { front: "Frontal", center: "Centro", back: "Posterior" };

const functionId = new URLSearchParams(location.search).get("functionId");

// Estado de la página
const state = {
  ctx: null, // { fn, room, rows }
  selected: [], // [{ seatId, functionSeatId, seatCode, location }]
  quantity: 2,
};

/* ------------------------------------------------------------ arranque */

async function init() {
  const main = $("#main");

  if (!functionId) {
    setError(main, "No se indicó ninguna función.");
    return;
  }

  try {
    state.ctx = await getFunctionContext(functionId);
    render(main);
  } catch {
    setError(main, "No se pudo cargar la función.", init);
  }
}

/* ------------------------------------------------------------- render */

function render(main) {
  const { fn, room, rows } = state.ctx;
  const total = rows.reduce((n, r) => n + r.seats.length, 0);
  const free = rows.reduce(
    (n, r) => n + r.seats.filter((s) => s.status === "available").length,
    0
  );

  main.dataset.state = "ready";
  main.innerHTML = `
    <div class="container booking-layout">
      <section class="booking-summary" aria-label="Resumen de la función">
        <h1 class="booking-summary__movie">${fn.movieTitle}</h1>
        <dl class="booking-summary__grid">
          <div><dt>Fecha</dt><dd>${dateOptionLabel(fn.date)}</dd></div>
          <div><dt>Hora</dt><dd>${fn.time}</dd></div>
          <div><dt>Sala</dt><dd>${room.name} · ${fn.format}</dd></div>
          <div><dt>Precio</dt><dd>${formatMoney(fn.price)} / boleto</dd></div>
          <div><dt>Disponibles</dt><dd>${free} / ${total}</dd></div>
        </dl>
      </section>

      <div class="booking-grid">
        <section class="seat-map-wrap" aria-label="Mapa de butacas">
          <div class="screen">Pantalla</div>
          <div class="seat-map" id="seat-map"></div>
          <ul class="seat-legend">
            <li><span class="legend-swatch legend-swatch--available"></span> Disponible</li>
            <li><span class="legend-swatch legend-swatch--selected"></span> Seleccionada</li>
            <li><span class="legend-swatch legend-swatch--reserved"></span> Reservada</li>
            <li><span class="legend-swatch legend-swatch--sold"></span> Ocupada</li>
            <li><span class="legend-swatch legend-swatch--best"></span> Mejor vista</li>
          </ul>
        </section>

        <aside class="booking-sidebar" aria-label="Tu selección">
          <div class="ticket-count">
            <span class="ticket-count__label">Tickets</span>
            <div class="ticket-count__controls">
              <button type="button" id="qty-minus" aria-label="Menos tickets">−</button>
              <span id="qty-value" aria-live="polite">${state.quantity}</span>
              <button type="button" id="qty-plus" aria-label="Más tickets">+</button>
            </div>
          </div>

          <div class="selection">
            <h2 class="selection__title">Butacas seleccionadas</h2>
            <ul class="selection__list" id="selection-list"></ul>
          </div>

          <dl class="totals">
            <div><dt>Precio unitario</dt><dd>${formatMoney(fn.price)}</dd></div>
            <div class="totals__total"><dt>Total</dt><dd id="total-value">${formatMoney(0)}</dd></div>
          </dl>

          <p class="booking-hint" id="booking-hint" role="status" aria-live="polite"></p>
          <button type="button" class="button button--primary booking-reserve" id="reserve-btn" disabled>
            Reservar
          </button>
        </aside>
      </div>

      <section class="final-summary" id="final-summary" hidden aria-live="polite"></section>
    </div>
  `;

  renderSeatMap($("#seat-map"), rows);
  wireControls();
  updateSidebar();
}

function renderSeatMap(mapEl, rows) {
  for (const { row, seats } of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "seat-row";
    rowEl.innerHTML = `<span class="seat-row__label">${row}</span>`;

    for (const seat of seats) {
      const seatEl = document.createElement("cinema-seat");
      seatEl.setAttribute("seat-code", seat.seatCode);
      seatEl.setAttribute("status", seat.status);
      seatEl.setAttribute("location", seat.location);
      if (seat.recommended) seatEl.setAttribute("recommended", "");
      seatEl.seatId = seat.seatId;
      seatEl.functionSeatId = seat.functionSeatId;
      rowEl.append(seatEl);
    }
    mapEl.append(rowEl);
  }

  mapEl.addEventListener("seat-toggle", onSeatToggle);
}

/* --------------------------------------------------------- interacción */

function onSeatToggle(event) {
  const { seatId, functionSeatId, seatCode, location, selected } = event.detail;

  if (selected) {
    state.selected.push({ seatId, functionSeatId, seatCode, location });

    if (state.selected.length > state.quantity) {
      if (state.quantity < MAX_SEATS) {
        state.quantity = state.selected.length; // subir tickets automáticamente
      } else {
        state.selected.pop(); // al máximo: revertir esta selección
        event.target.setAttribute("status", "available");
        showHint(`Máximo ${MAX_SEATS} butacas por reserva.`);
        return;
      }
    }
  } else {
    state.selected = state.selected.filter((s) => s.seatId !== seatId);
  }

  updateSidebar();
}

function wireControls() {
  $("#qty-minus").addEventListener("click", () => changeQuantity(-1));
  $("#qty-plus").addEventListener("click", () => changeQuantity(1));
  $("#reserve-btn").addEventListener("click", onReserve);
}

function changeQuantity(delta) {
  const next = Math.min(MAX_SEATS, Math.max(1, state.quantity + delta));
  state.quantity = next;

  // Si sobran butacas seleccionadas, quitar las últimas.
  while (state.selected.length > state.quantity) {
    const removed = state.selected.pop();
    const el = document.querySelector(`cinema-seat[seat-code="${removed.seatCode}"]`);
    el?.setAttribute("status", "available");
  }

  updateSidebar();
}

/* ------------------------------------------------------ panel lateral */

function updateSidebar() {
  const { fn } = state.ctx;

  $("#qty-value").textContent = state.quantity;

  const list = $("#selection-list");
  if (state.selected.length === 0) {
    list.innerHTML = `<li class="selection__empty">Ninguna butaca seleccionada</li>`;
  } else {
    list.innerHTML = state.selected
      .slice()
      .sort((a, b) => a.seatCode.localeCompare(b.seatCode))
      .map(
        (s) =>
          `<li><span class="selection__code">${s.seatCode}</span>
           <span class="selection__loc">${LOCATION_ES[s.location] ?? s.location}</span></li>`
      )
      .join("");
  }

  $("#total-value").textContent = formatMoney(fn.price * state.selected.length);

  const hint = $("#booking-hint");
  const reserveBtn = $("#reserve-btn");
  const missing = state.quantity - state.selected.length;

  if (state.selected.length === 0) {
    hint.textContent = "Selecciona tus butacas en el mapa.";
    reserveBtn.disabled = true;
  } else if (missing > 0) {
    hint.textContent = `Selecciona ${missing} butaca${missing > 1 ? "s" : ""} más.`;
    reserveBtn.disabled = true;
  } else {
    hint.textContent = "";
    reserveBtn.disabled = false;
  }
}

function showHint(message) {
  const hint = $("#booking-hint");
  hint.textContent = message;
  hint.dataset.state = "warn";
  setTimeout(() => {
    hint.dataset.state = "";
    updateSidebar();
  }, 2500);
}

/* --------------------------------------------------------- reservar */

async function onReserve() {
  if (state.selected.length === 0 || state.selected.length !== state.quantity) return;

  const btn = $("#reserve-btn");
  btn.disabled = true;
  btn.textContent = "Comprobando…";

  // RF-15: re-consultar disponibilidad justo antes de confirmar
  const seatIds = state.selected.map((s) => s.seatId);
  const check = await checkSeatsAvailable(state.ctx.fn.id, seatIds).catch(() => null);

  btn.textContent = "Reservar";

  if (!check) {
    showHint("Error al comprobar disponibilidad. Inténtalo de nuevo.");
    btn.disabled = false;
    return;
  }
  if (!check.ok) {
    showHint(`Ya no están libres: ${check.unavailable.join(", ")}. Recarga la página.`);
    btn.disabled = false;
    return;
  }

  showFinalSummary();
}

function showFinalSummary() {
  const { fn, room } = state.ctx;
  const seatsSorted = state.selected
    .slice()
    .sort((a, b) => a.seatCode.localeCompare(b.seatCode));
  const total = fn.price * seatsSorted.length;

  const box = $("#final-summary");
  box.hidden = false;
  box.innerHTML = `
    <h2 class="final-summary__title">Resumen de la reserva</h2>
    <dl class="final-summary__grid">
      <div><dt>Película</dt><dd>${fn.movieTitle}</dd></div>
      <div><dt>Sala</dt><dd>${room.name}</dd></div>
      <div><dt>Fecha</dt><dd>${dateOptionLabel(fn.date)}</dd></div>
      <div><dt>Hora</dt><dd>${fn.time}</dd></div>
      <div><dt>Butacas</dt><dd>${seatsSorted.map((s) => s.seatCode).join(", ")}</dd></div>
      <div><dt>Cantidad</dt><dd>${seatsSorted.length}</dd></div>
      <div><dt>Precio unitario</dt><dd>${formatMoney(fn.price)}</dd></div>
      <div class="final-summary__total"><dt>Total</dt><dd>${formatMoney(total)}</dd></div>
    </dl>
    <p class="final-summary__error" id="final-error" hidden></p>
    <div class="final-summary__actions">
      <button type="button" class="button button--primary" id="confirm-btn">Confirmar reserva</button>
      <button type="button" class="button button--ghost" id="cancel-final">Cancelar</button>
    </div>
  `;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });

  $("#cancel-final").addEventListener("click", () => {
    box.hidden = true;
    box.innerHTML = "";
  });

  $("#confirm-btn").addEventListener("click", onConfirm);
}

async function onConfirm() {
  const btn = $("#confirm-btn");
  const errEl = $("#final-error");
  btn.disabled = true;
  btn.textContent = "Reservando…";
  errEl.hidden = true;

  try {
    const reservation = await createReservation({
      ctx: state.ctx,
      selectedSeats: state.selected,
    });
    showReservationSuccess(reservation);
  } catch (error) {
    errEl.textContent = error.message;
    errEl.hidden = false;
    btn.disabled = false;
    btn.textContent = "Confirmar reserva";
  }
}

function showReservationSuccess(reservation) {
  // Bloquear visualmente las butacas y el panel
  for (const seat of state.selected) {
    document
      .querySelector(`cinema-seat[seat-code="${seat.seatCode}"]`)
      ?.setAttribute("status", "reserved");
  }
  $("#reserve-btn").disabled = true;
  $("#qty-minus").disabled = true;
  $("#qty-plus").disabled = true;
  state.selected = [];

  const box = $("#final-summary");
  box.innerHTML = `
    <h2 class="final-summary__title">¡Reserva confirmada! 🎟️</h2>
    <p>Butacas <strong>${reservation.seatCodes.join(", ")}</strong> reservadas para
    <strong>${reservation.movieTitle}</strong> · ${dateOptionLabel(reservation.date)} · ${reservation.time}.</p>
    <p class="final-summary__note">
      La reserva está sin pagar. Puedes pagarla o cancelarla desde "Mis reservas".
    </p>
    <div class="final-summary__actions">
      <a class="button button--primary" href="${sitePath("pages/reservations.html")}">Ver mis reservas</a>
      <a class="button button--ghost" href="${sitePath("index.html")}">Volver al inicio</a>
    </div>
  `;
}

/* --------------------------------------------------------------- gate */

if (!isLoggedIn()) {
  requireAuth();
} else {
  init();
}
