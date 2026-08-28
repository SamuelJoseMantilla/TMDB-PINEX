// js/ui/favorite-button.js
// Botón de favorito reutilizable (ficha de película y de serie). Gestiona su
// propio estado: consulta si ya es favorito y hace toggle al pulsar.

import { toggleFavorite, findFavorite } from "../modules/favorites.js";
import { isLoggedIn, getCurrentUser } from "../modules/auth.js";
import { sitePath } from "../utils/helpers.js";

const HEART = `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M12 21s-7-4.35-9.5-8.5C.5 9 2.5 5 6.5 5 9 5 12 7.5 12 7.5S15 5 17.5 5c4 0 6 4 4 7.5C19 16.65 12 21 12 21Z" />
  </svg>`;

/**
 * @param {{ mediaType: "movie"|"tv", tmdbId: number, title: string, posterPath: string|null }} media
 * @returns {HTMLButtonElement}
 */
export function createFavoriteButton(media) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "button button--ghost fav-button";
  btn.innerHTML = `${HEART}<span class="fav-button__label">Añadir a favoritos</span>`;

  const setState = (isFav) => {
    btn.classList.toggle("is-fav", isFav);
    btn.querySelector(".fav-button__label").textContent = isFav
      ? "En favoritos"
      : "Añadir a favoritos";
    btn.setAttribute("aria-pressed", String(isFav));
  };

  setState(false);

  if (isLoggedIn()) {
    findFavorite(getCurrentUser().id, media.mediaType, media.tmdbId)
      .then((fav) => setState(Boolean(fav)))
      .catch(() => {});
  }

  btn.addEventListener("click", async () => {
    if (!isLoggedIn()) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = sitePath(`pages/login.html?next=${next}`);
      return;
    }

    btn.disabled = true;
    try {
      setState(await toggleFavorite(media));
    } catch (error) {
      alert(error.message);
    } finally {
      btn.disabled = false;
    }
  });

  return btn;
}
