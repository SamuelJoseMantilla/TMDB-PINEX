// js/modules/my-tickets.js · pages/tickets.html
// Lista las compras (tickets) del usuario autenticado.

import "../components/site-header.js";
import "../components/site-footer.js";

import { isLoggedIn, requireAuth, getCurrentUser } from "./auth.js";
import { getUserPurchases } from "./purchases.js";
import { getMovieDetails, imageUrl } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setReady } from "../ui/states.js";
import {
  formatMoney,
  dateOptionLabel,
  sitePath,
  POSTER_PLACEHOLDER,
} from "../utils/helpers.js";

const posterCache = new Map();
function fetchPoster(tmdbId) {
  if (!posterCache.has(tmdbId)) {
    posterCache.set(
      tmdbId,
      getMovieDetails(tmdbId)
        .then((m) => imageUrl(m.poster_path, "w185"))
        .catch(() => "")
    );
  }
  return posterCache.get(tmdbId);
}

async function load() {
  const list = $("#tickets-list");
  setLoading(list, "Cargando tus tickets…");

  try {
    const purchases = await getUserPurchases(getCurrentUser().id);

    if (purchases.length === 0) {
      list.dataset.state = "empty";
      list.innerHTML = `
        <li class="state">
          Todavía no has comprado ningún ticket.
          <a href="${sitePath("index.html")}">Ver la cartelera</a>
        </li>`;
      return;
    }

    list.replaceChildren(...purchases.map(renderCard));
    setReady(list);

    for (const tmdbId of [...new Set(purchases.map((p) => p.tmdbId))]) {
      fetchPoster(tmdbId).then((url) => {
        if (!url) return;
        list.querySelectorAll(`img[data-tmdb="${tmdbId}"]`).forEach((img) => (img.src = url));
      });
    }
  } catch {
    setError(list, "No se pudieron cargar tus tickets.", load);
  }
}

function renderCard(purchase) {
  const li = document.createElement("li");
  li.className = "res-card";
  li.dataset.status = "paid";
  li.innerHTML = `
    <img class="res-card__poster" data-tmdb="${purchase.tmdbId}"
         src="${POSTER_PLACEHOLDER}" alt="Póster de ${purchase.movieTitle}" />
    <div class="res-card__body">
      <div class="res-card__head">
        <h2 class="res-card__title">${purchase.movieTitle}</h2>
        <span class="badge badge--success">${purchase.ticketId}</span>
      </div>
      <dl class="res-card__meta">
        <div><dt>Fecha</dt><dd>${dateOptionLabel(purchase.date)}</dd></div>
        <div><dt>Hora</dt><dd>${purchase.time}</dd></div>
        <div><dt>Sala</dt><dd>${purchase.roomName} · ${purchase.format}</dd></div>
        <div><dt>Butacas</dt><dd>${purchase.seatCodes.join(", ")}</dd></div>
        <div><dt>Total</dt><dd>${formatMoney(purchase.total)}</dd></div>
      </dl>
      <div class="res-card__actions">
        <a class="button button--primary button--sm"
           href="${sitePath(`pages/ticket.html?reservationId=${purchase.reservationId}`)}">Ver ticket</a>
      </div>
    </div>
  `;
  return li;
}

if (!isLoggedIn()) {
  requireAuth();
} else {
  load();
}
