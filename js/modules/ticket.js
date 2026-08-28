// js/modules/ticket.js · pages/ticket.html?reservationId=<id>
// Ticket digital de una compra.

import "../components/site-header.js";
import "../components/site-footer.js";

import { isLoggedIn, requireAuth, getCurrentUser } from "./auth.js";
import { getPurchaseByReservation } from "./purchases.js";
import { getMovieDetails, imageUrl } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setError } from "../ui/states.js";
import {
  formatMoney,
  dateOptionLabel,
  sitePath,
  POSTER_PLACEHOLDER,
} from "../utils/helpers.js";
import { fakeQrSvg } from "../utils/fake-qr.js";

const reservationId = new URLSearchParams(location.search).get("reservationId");

async function init() {
  const main = $("#main");

  if (!reservationId) {
    setError(main, "No se indicó ningún ticket.");
    return;
  }

  try {
    const purchase = await getPurchaseByReservation(reservationId);

    if (!purchase) {
      setError(main, "No encontramos una compra para esta reserva.");
      return;
    }
    if (purchase.userId !== getCurrentUser().id) {
      setError(main, "Este ticket no es tuyo.");
      return;
    }

    const poster = await getMovieDetails(purchase.tmdbId)
      .then((movie) => imageUrl(movie.poster_path, "w342"))
      .catch(() => "");

    render(main, purchase, poster);
  } catch {
    setError(main, "No se pudo cargar el ticket.", init);
  }
}

function render(main, purchase, poster) {
  main.dataset.state = "ready";
  main.innerHTML = `
    <div class="container">
      <article class="ticket">
        <header class="ticket__brand">
          <span class="ticket__logo">CINEHUB</span>
          <span class="ticket__type">Ticket digital</span>
        </header>

        <div class="ticket__main">
          <img class="ticket__poster" src="${poster || POSTER_PLACEHOLDER}"
               alt="Póster de ${purchase.movieTitle}" />
          <div class="ticket__movie">
            <h1 class="ticket__title">${purchase.movieTitle}</h1>
            <p class="ticket__format">${purchase.roomName} · ${purchase.format}</p>
          </div>
        </div>

        <dl class="ticket__meta">
          <div><dt>Fecha</dt><dd>${dateOptionLabel(purchase.date)}</dd></div>
          <div><dt>Hora</dt><dd>${purchase.time}</dd></div>
          <div><dt>Butacas</dt><dd>${purchase.seatCodes.join(", ")}</dd></div>
          <div><dt>Boletos</dt><dd>${purchase.quantity}</dd></div>
          <div><dt>Total</dt><dd>${formatMoney(purchase.total)}</dd></div>
        </dl>

        <div class="ticket__stub">
          <div class="ticket__qr">${fakeQrSvg(purchase.ticketId)}</div>
          <div class="ticket__code">
            <span class="ticket__code-label">Nº de ticket</span>
            <span class="ticket__code-value">${purchase.ticketId}</span>
          </div>
        </div>
      </article>

      <div class="ticket__actions">
        <a class="button button--ghost" href="${sitePath("pages/tickets.html")}">Mis tickets</a>
        <a class="button button--ghost" href="${sitePath("index.html")}">Inicio</a>
      </div>
    </div>
  `;
}

if (!isLoggedIn()) {
  requireAuth();
} else {
  init();
}
