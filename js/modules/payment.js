// js/modules/payment.js · pages/payment.html?reservationId=<id>
// Pago SIMULADO: solo se valida el formato de la tarjeta, no hay pasarela real.

import "../components/site-header.js";
import "../components/site-footer.js";

import { isLoggedIn, requireAuth, getCurrentUser } from "./auth.js";
import { getById } from "../services/api.service.js";
import { payReservation, getPurchaseByReservation } from "./purchases.js";
import { $ } from "../utils/dom.js";
import { setError } from "../ui/states.js";
import { formatMoney, dateOptionLabel, sitePath } from "../utils/helpers.js";

const reservationId = new URLSearchParams(location.search).get("reservationId");

async function init() {
  const main = $("#main");

  if (!reservationId) {
    setError(main, "No se indicó ninguna reserva.");
    return;
  }

  try {
    const [reservation, purchase] = await Promise.all([
      getById("reservations", reservationId),
      getPurchaseByReservation(reservationId),
    ]);
    const user = getCurrentUser();

    if (reservation.userId !== user.id) {
      setError(main, "Esta reserva no es tuya.");
      return;
    }
    if (purchase) {
      renderAlreadyPaid(main, reservation);
      return;
    }
    if (reservation.status === "cancelled") {
      setError(main, "Esta reserva está cancelada.");
      return;
    }

    render(main, reservation);
  } catch {
    setError(main, "No se pudo cargar la reserva.", init);
  }
}

/* ------------------------------------------------------------- render */

function render(main, reservation) {
  main.dataset.state = "ready";
  main.innerHTML = `
    <div class="container payment-layout">
      <section class="order-summary" aria-label="Resumen del pedido">
        <h1 class="order-summary__title">Resumen del pedido</h1>
        <dl class="order-summary__grid">
          <div><dt>Película</dt><dd>${reservation.movieTitle}</dd></div>
          <div><dt>Sala</dt><dd>${reservation.roomName} · ${reservation.format}</dd></div>
          <div><dt>Fecha</dt><dd>${dateOptionLabel(reservation.date)}</dd></div>
          <div><dt>Hora</dt><dd>${reservation.time}</dd></div>
          <div><dt>Butacas</dt><dd>${reservation.seatCodes.join(", ")}</dd></div>
          <div><dt>Cantidad</dt><dd>${reservation.quantity}</dd></div>
        </dl>
        <p class="order-summary__total">Total <span>${formatMoney(reservation.total)}</span></p>
      </section>

      <section class="pay-form-wrap" aria-label="Datos de pago">
        <h2 class="pay-form-wrap__title">Pago</h2>
        <p class="pay-form-wrap__note">Pago simulado · no introduzcas datos reales.</p>

        <form id="pay-form" novalidate>
          <div class="field">
            <label class="field__label" for="pay-name">Nombre en la tarjeta</label>
            <input class="field__control" id="pay-name" type="text" autocomplete="cc-name" required />
          </div>
          <div class="field">
            <label class="field__label" for="pay-number">Número de tarjeta</label>
            <input class="field__control" id="pay-number" inputmode="numeric" placeholder="4242 4242 4242 4242" autocomplete="cc-number" required />
          </div>
          <div class="pay-form__row">
            <div class="field">
              <label class="field__label" for="pay-exp">Caducidad</label>
              <input class="field__control" id="pay-exp" inputmode="numeric" placeholder="MM/YY" autocomplete="cc-exp" required />
            </div>
            <div class="field">
              <label class="field__label" for="pay-cvc">CVC</label>
              <input class="field__control" id="pay-cvc" inputmode="numeric" placeholder="123" autocomplete="cc-csc" required />
            </div>
          </div>

          <p class="pay-form__error" id="pay-error" role="alert" hidden></p>

          <button type="submit" class="button button--primary pay-form__submit" id="pay-submit">
            Pagar ${formatMoney(reservation.total)}
          </button>
        </form>
      </section>
    </div>
  `;

  wireFormatting();
  $("#pay-form").addEventListener("submit", (event) => onSubmit(event, reservation));
}

function renderAlreadyPaid(main, reservation) {
  main.dataset.state = "ready";
  main.innerHTML = `
    <div class="container payment-done">
      <h1>Esta reserva ya está pagada</h1>
      <p>${reservation.movieTitle} · butacas ${reservation.seatCodes.join(", ")}</p>
      <div class="payment-done__actions">
        <a class="button button--primary" href="${sitePath("pages/reservations.html")}">Ver mis reservas</a>
      </div>
    </div>
  `;
}

/* --------------------------------------------------------- validación */

function validate() {
  const number = $("#pay-number").value.replace(/\s+/g, "");
  const name = $("#pay-name").value.trim();
  const exp = $("#pay-exp").value.trim();
  const cvc = $("#pay-cvc").value.trim();

  if (name.length < 2) return "Escribe el nombre de la tarjeta.";
  if (!/^\d{16}$/.test(number)) return "El número de tarjeta debe tener 16 dígitos.";

  const expMatch = exp.match(/^(\d{2})\/(\d{2})$/);
  if (!expMatch) return "La caducidad debe tener el formato MM/YY.";
  const month = Number(expMatch[1]);
  if (month < 1 || month > 12) return "El mes de caducidad no es válido.";

  if (!/^\d{3,4}$/.test(cvc)) return "El CVC debe tener 3 o 4 dígitos.";

  return null;
}

async function onSubmit(event, reservation) {
  event.preventDefault();
  const errEl = $("#pay-error");
  const btn = $("#pay-submit");

  const error = validate();
  if (error) {
    errEl.textContent = error;
    errEl.hidden = false;
    return;
  }
  errEl.hidden = true;

  btn.disabled = true;
  btn.textContent = "Procesando pago…";

  try {
    const purchase = await payReservation(reservation.id);
    renderSuccess($("#main"), purchase);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
    btn.disabled = false;
    btn.textContent = `Pagar ${formatMoney(reservation.total)}`;
  }
}

function renderSuccess(main, purchase) {
  main.innerHTML = `
    <div class="container payment-done">
      <h1>¡Pago confirmado! 🎉</h1>
      <p class="payment-done__ticket">Ticket <strong>${purchase.ticketId}</strong></p>
      <p>${purchase.movieTitle} · ${dateOptionLabel(purchase.date)} · ${purchase.time}</p>
      <p>Butacas ${purchase.seatCodes.join(", ")} · ${formatMoney(purchase.total)}</p>
      <div class="payment-done__actions">
        <a class="button button--primary" href="${sitePath(`pages/ticket.html?reservationId=${purchase.reservationId}`)}">Ver ticket</a>
        <a class="button button--ghost" href="${sitePath("pages/reservations.html")}">Mis reservas</a>
      </div>
    </div>
  `;
}

/* ----------------------------------------------------- formato inputs */

function wireFormatting() {
  const number = $("#pay-number");
  number.addEventListener("input", () => {
    const digits = number.value.replace(/\D/g, "").slice(0, 16);
    number.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  });

  const exp = $("#pay-exp");
  exp.addEventListener("input", () => {
    const digits = exp.value.replace(/\D/g, "").slice(0, 4);
    exp.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });

  const cvc = $("#pay-cvc");
  cvc.addEventListener("input", () => {
    cvc.value = cvc.value.replace(/\D/g, "").slice(0, 4);
  });
}

/* --------------------------------------------------------------- gate */

if (!isLoggedIn()) {
  requireAuth();
} else {
  init();
}
