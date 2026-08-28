// js/modules/my-favorites.js · pages/favorites.html
// Rejilla con las películas y series que el usuario marcó como favoritas.

import "../components/site-header.js";
import "../components/site-footer.js";

import { isLoggedIn, requireAuth, getCurrentUser } from "./auth.js";
import { getUserFavorites } from "./favorites.js";
import { getMovieDetails, getTvDetails } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setReady } from "../ui/states.js";
import { createMovieCard, createTvCard } from "../ui/render.js";
import { sitePath } from "../utils/helpers.js";

async function load() {
  const grid = $("#favorites-grid");
  setLoading(grid, "Cargando favoritos…");

  try {
    const favorites = await getUserFavorites(getCurrentUser().id);

    if (favorites.length === 0) {
      grid.dataset.state = "empty";
      grid.innerHTML = `
        <li class="state">
          Aún no tienes favoritos. Marca una película o serie con ♥.
          <a href="${sitePath("index.html")}">Ver la cartelera</a>
        </li>`;
      return;
    }

    const cards = await Promise.all(favorites.map(toCard));
    grid.replaceChildren(...cards);
    setReady(grid);
  } catch {
    setError(grid, "No se pudieron cargar tus favoritos.", load);
  }
}

/** Trae los datos frescos de TMDB; si falla, usa lo guardado. */
async function toCard(fav) {
  try {
    if (fav.mediaType === "tv") {
      return createTvCard(await getTvDetails(fav.tmdbId));
    }
    return createMovieCard(await getMovieDetails(fav.tmdbId));
  } catch {
    const shaped = { id: fav.tmdbId, title: fav.title, name: fav.title, poster_path: fav.posterPath };
    return fav.mediaType === "tv" ? createTvCard(shaped) : createMovieCard(shaped);
  }
}

if (!isLoggedIn()) {
  requireAuth();
} else {
  load();
}
