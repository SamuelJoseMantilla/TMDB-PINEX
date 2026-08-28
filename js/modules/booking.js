// js/modules/booking.js · pages/booking.html?functionId=<id>
//
// Fase 14: carga la función y muestra su resumen (prueba de getFunctionContext).
// Fase 15: el mapa de sillas usará el Web Component <cinema-seat>.
// Fase 16: selección de sillas + resumen en vivo.
// Fase 17: crear la reserva.

import "../components/site-header.js";
import "../components/site-footer.js";
import "../components/cinema-seat.js";

import { isLoggedIn, requireAuth } from "./auth.js";
import { getFunctionContext } from "./seats.js";
import { $ } from "../utils/dom.js";
import { setError } from "../ui/states.js";
import { formatMoney, dateOptionLabel } from "../utils/helpers.js";

const functionId = new URLSearchParams(location.search).get("functionId");

async function init() {
  const main = $("#main");

  if (!functionId) {
    setError(main, "No se indicó ninguna función.");
    return;
  }

  try {
    const ctx = await getFunctionContext(functionId);
    render(main, ctx);
  } catch {
    setError(main, "No se pudo cargar la función.", init);
  }
}

function render(main, { fn, room, rows }) {
  const totalSeats = rows.reduce((sum, r) => sum + r.seats.length, 0);
  const available = rows.reduce(
    (sum, r) => sum + r.seats.filter((s) => s.status === "available").length,
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
          <div><dt>Disponibles</dt><dd>${available} / ${totalSeats}</dd></div>
        </dl>
      </section>

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
    </div>
  `;

  renderSeatMap(main.querySelector("#seat-map"), rows);
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

  // Fase 15: solo registramos el evento. La selección real (array, resumen,
  // límite de tickets, botón Reservar) llega en la Fase 16.
  mapEl.addEventListener("seat-toggle", (event) => {
    console.log("seat-toggle:", event.detail);
  });
}

if (!isLoggedIn()) {
  requireAuth(); // redirige a login guardando ?next=
} else {
  init();
}
