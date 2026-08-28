// js/modules/booking.js · pages/booking.html?functionId=<id>
//
// Fase 14: carga la función y muestra su resumen (prueba de getFunctionContext).
// Fase 15: el mapa de sillas usará el Web Component <cinema-seat>.
// Fase 16: selección de sillas + resumen en vivo.
// Fase 17: crear la reserva.

import "../components/site-header.js";
import "../components/site-footer.js";

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
        <p class="state">El mapa de butacas llega en la Fase 15 (Web Component &lt;cinema-seat&gt;).</p>
      </section>
    </div>
  `;
}

if (!isLoggedIn()) {
  requireAuth(); // redirige a login guardando ?next=
} else {
  init();
}
