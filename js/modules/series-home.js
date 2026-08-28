// js/modules/series-home.js
// Fila "Series populares" de la Homepage (TMDB, solo explorar).

import { getPopularTv, getTvGenres } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setEmpty, setReady } from "../ui/states.js";
import { createTvCard } from "../ui/render.js";

export async function initPopularSeries() {
  const row = $("#popular-series-row");
  if (!row) return;

  setLoading(row, "Loading series…");
  try {
    let genreMap = new Map();
    try {
      genreMap = new Map((await getTvGenres()).map((g) => [g.id, g.name]));
    } catch {
      /* decorativo */
    }

    const shows = (await getPopularTv()).filter((s) => s.poster_path);
    if (shows.length === 0) return setEmpty(row, "No hay series ahora mismo.");

    row.replaceChildren(...shows.slice(0, 12).map((s) => createTvCard(s, { genreMap })));
    setReady(row);
  } catch {
    setError(row, "No se pudieron cargar las series.", initPopularSeries);
  }
}
