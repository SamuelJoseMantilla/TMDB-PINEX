// js/modules/movies.js
// Secciones de listas de películas de la Homepage: Now Showing, Trending, Coming Soon.

import { getNowPlaying, getTrending, getUpcoming } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setEmpty, setReady } from "../ui/states.js";
import { createMovieCard, createTrendingItem } from "../ui/render.js";

/* --------------------------- Now Showing ------------------------------- */

export async function initNowShowing(genreMap) {
  const grid = $("#now-showing-grid");
  if (!grid) return;

  setLoading(grid, "Loading movies…");
  try {
    const movies = await getNowPlaying();
    if (!movies.length) return setEmpty(grid, "No movies showing right now.");

    grid.replaceChildren(
      ...movies.slice(0, 8).map((movie) => createMovieCard(movie, { genreMap }))
    );
    setReady(grid);
  } catch {
    setError(grid, "Couldn't load movies.", () => initNowShowing(genreMap));
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
    // "upcoming" a veces trae películas ya estrenadas: filtramos por fecha futura.
    const movies = (await getUpcoming())
      .filter((m) => m.release_date && m.release_date > today)
      .sort((a, b) => a.release_date.localeCompare(b.release_date));

    if (!movies.length) return setEmpty(grid, "No upcoming movies.");

    grid.replaceChildren(
      ...movies.slice(0, 8).map((movie) => createMovieCard(movie, { genreMap, badge: "Soon" }))
    );
    setReady(grid);
  } catch {
    setError(grid, "Couldn't load upcoming movies.", () => initComingSoon(genreMap));
  }
}
