// js/modules/my-reservations.js · pages/reservations.html
// Lista las reservas del usuario autenticado.

import "../components/site-header.js";
import "../components/site-footer.js";

import { isLoggedIn, requireAuth, getCurrentUser } from "./auth.js";
import { getUserReservations, cancelReservation } from "./reservations.js";
import { getMovieDetails, imageUrl } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setReady } from "../ui/states.js";
import {
  formatMoney,
  dateOptionLabel,
  sitePath,
  POSTER_PLACEHOLDER,
} from "../utils/helpers.js";

const STATUS_LABEL = {
  reserved: "Reservada",
  paid: "Pagada",
  cancelled: "Cancelada",
};

// Cache de pósters por tmdbId (guardamos la promesa para deduplicar).
const posterCache = new Map();
function fetchPoster(tmdbId) {
  if (!posterCache.has(tmdbId)) {
    posterCache.set(
      tmdbId,
      getMovieDetails(tmdbId)
        .then((movie) => imageUrl(movie.poster_path, "w185"))
        .catch(() => "")
    );
  }
  return posterCache.get(tmdbId);
}

async function load() {
  const list = $("#reservations-list");
  setLoading(list, "Cargando tus reservas…");

  try {
    const reservations = await getUserReservations(getCurrentUser().id);

    if (reservations.length === 0) {
      list.dataset.state = "empty";
      list.innerHTML = `
        <li class="state">
          Todavía no tienes reservas.
          <a href="${sitePath("index.html")}">Ver la cartelera</a>
        </li>`;
      return;
    }

    list.replaceChildren(...reservations.map(renderCard));
    setReady(list);
    fillPosters(list, reservations);
  } catch {
    setError(list, "No se pudieron cargar tus reservas.", load);
  }
}

function renderCard(reservation) {
  const li = document.createElement("li");
  li.className = "res-card";
  li.dataset.status = reservation.status;
  li.innerHTML = `
    <img class="res-card__poster" data-tmdb="${reservation.tmdbId}"
         src="${POSTER_PLACEHOLDER}" alt="Póster de ${reservation.movieTitle}" />

    <div class="res-card__body">
      <div class="res-card__head">
        <h2 class="res-card__title">${reservation.movieTitle}</h2>
        <span class="badge ${badgeClass(reservation.status)}">
          ${STATUS_LABEL[reservation.status] ?? reservation.status}
        </span>
      </div>

      <dl class="res-card__meta">
        <div><dt>Fecha</dt><dd>${dateOptionLabel(reservation.date)}</dd></div>
        <div><dt>Hora</dt><dd>${reservation.time}</dd></div>
        <div><dt>Sala</dt><dd>${reservation.roomName} · ${reservation.format}</dd></div>
        <div><dt>Butacas</dt><dd>${reservation.seatCodes.join(", ")}</dd></div>
        <div><dt>Total</dt><dd>${formatMoney(reservation.total)}</dd></div>
      </dl>

      ${renderActions(reservation)}
    </div>
  `;
  return li;
}

function renderActions(reservation) {
  if (reservation.status === "reserved") {
    return `
      <div class="res-card__actions">
        <a class="button button--primary button--sm"
           href="${sitePath(`pages/payment.html?reservationId=${reservation.id}`)}">Pay now</a>
        <button type="button" class="button button--ghost button--sm" data-cancel="${reservation.id}">
          Cancel reservation
        </button>
      </div>`;
  }
  if (reservation.status === "paid") {
    return `
      <div class="res-card__actions">
        <a class="button button--primary button--sm"
           href="${sitePath(`pages/ticket.html?reservationId=${reservation.id}`)}">Ver ticket</a>
      </div>`;
  }
  return ""; // cancelada: sin acciones
}

function badgeClass(status) {
  if (status === "paid") return "badge--success";
  if (status === "cancelled") return "badge--muted";
  return "";
}

function fillPosters(list, reservations) {
  const uniqueIds = [...new Set(reservations.map((r) => r.tmdbId))];
  for (const tmdbId of uniqueIds) {
    fetchPoster(tmdbId).then((url) => {
      if (!url) return;
      list
        .querySelectorAll(`img[data-tmdb="${tmdbId}"]`)
        .forEach((img) => (img.src = url));
    });
  }
}

async function onListClick(event) {
  const cancelBtn = event.target.closest("[data-cancel]");
  if (!cancelBtn) return;

  const card = cancelBtn.closest(".res-card");
  const reservationId = cancelBtn.dataset.cancel;

  if (!confirm("¿Cancelar esta reserva? Se liberarán las butacas.")) return;

  cancelBtn.disabled = true;
  cancelBtn.textContent = "Cancelando…";

  try {
    await cancelReservation(reservationId);

    // Actualizar la tarjeta en el sitio
    card.dataset.status = "cancelled";
    const badge = card.querySelector(".badge");
    badge.className = "badge badge--muted";
    badge.textContent = "Cancelada";
    card.querySelector(".res-card__actions")?.remove();
  } catch (error) {
    cancelBtn.disabled = false;
    cancelBtn.textContent = "Cancel reservation";
    alert(error.message);
  }
}

/* --------------------------------------------------------------- gate */

if (!isLoggedIn()) {
  requireAuth();
} else {
  $("#reservations-list").addEventListener("click", onListClick);
  load();
}
