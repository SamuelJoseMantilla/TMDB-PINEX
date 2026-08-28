// js/modules/movies.js
// Secciones de listas de películas de la Homepage: Now Showing, Trending, Coming Soon.

import {
  getTrending,
  getUpcoming,
  getMovieDetails,
} from "../services/tmdb.service.js";
import { getAll } from "../services/api.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setEmpty, setReady } from "../ui/states.js";
import { createMovieCard, createTrendingItem } from "../ui/render.js";

/* --------------------------- Now Showing ------------------------------- */
// "Now Showing" = la cartelera REAL de CINEHUB: las películas que tienen
// funciones programadas en JSON Server. Así toda tarjeta es reservable.

export async function initNowShowing(genreMap) {
  const grid = $("#now-showing-grid");
  if (!grid) return;

  setLoading(grid, "Loading movies…");
  try {
    const functions = await getAll("functions");
    const tmdbIds = [...new Set(functions.map((f) => f.tmdbId))].slice(0, 12);

    const details = await Promise.all(
      tmdbIds.map((id) => getMovieDetails(id).catch(() => null))
    );
    const movies = details.filter(Boolean);

    if (!movies.length) return setEmpty(grid, "No hay películas en cartelera.");

    grid.replaceChildren(...movies.slice(0, 10).map((m) => createMovieCard(m, { genreMap })));
    setReady(grid);
  } catch {
    setError(grid, "No se pudo cargar la cartelera.", () => initNowShowing(genreMap));
  }
}

/* --------------------------- Trending Now ----------------------------- */

export async function initTrending(genreMap) {
  const list = $("#trending-list");
  if (!list) return;

  setLoading(list, "Loading trending…");
  try {
    const movies = await getTrending();
    if (!movies.length) return setEmpty(list, "Nothing trending yet.");

    list.replaceChildren(
      ...movies.slice(0, 6).map((movie, i) => createTrendingItem(movie, i + 1, genreMap))
    );
    setReady(list);
  } catch {
    setError(list, "Couldn't load trending movies.", () => initTrending(genreMap));
  }
}

/* --------------------------- Coming Soon ------------------------------ */

export async function initComingSoon(genreMap) {
  const grid = $("#coming-soon-grid");
  if (!grid) return;

  setLoading(grid, "Loading upcoming…");
  try {
    const today = new Date().toISOString().slice(0, 10);
    const all = (await getUpcoming()).filter((m) => m.poster_path);

    // Preferimos las de fecha futura; si no hay (TMDB a veces mezcla), mostramos
    // igualmente las más recientes de la lista de "upcoming".
    const future = all
      .filter((m) => m.release_date && m.release_date > today)
      .sort((a, b) => a.release_date.localeCompare(b.release_date));
    const movies = future.length > 0 ? future : all;

    if (!movies.length) return setEmpty(grid, "No hay estrenos próximos.");

    grid.replaceChildren(
      ...movies.slice(0, 10).map((movie) => createMovieCard(movie, { genreMap, badge: "Soon" }))
    );
    setReady(grid);
  } catch {
    setError(grid, "No se pudieron cargar los próximos estrenos.", () => initComingSoon(genreMap));
  }
}
