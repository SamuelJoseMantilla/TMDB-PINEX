// js/modules/search.js
// Página de resultados de búsqueda: pages/search.html?q=<texto>

import "../components/site-header.js";
import "../components/site-footer.js";

import { searchMovies, getGenres } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setEmpty, setReady } from "../ui/states.js";
import { createMovieCard } from "../ui/render.js";

let genreMap = new Map();

async function runSearch(query) {
  const grid = $("#results-grid");
  const title = $("#listing-title");

  title.textContent = query ? `Resultados para "${query}"` : "Buscar películas";

  if (!query) {
    setEmpty(grid, "Escribe algo para buscar una película.");
    return;
  }

  setLoading(grid, "Buscando…");
  try {
    const movies = (await searchMovies(query)).filter((m) => m.poster_path);
    if (movies.length === 0) {
      setEmpty(grid, `Sin resultados para "${query}".`);
      return;
    }
    grid.replaceChildren(...movies.map((movie) => createMovieCard(movie, { genreMap })));
    setReady(grid);
  } catch {
    setError(grid, "No se pudo completar la búsqueda.", () => runSearch(query));
  }
}

async function init() {
  const form = $("#listing-search");
  const input = $("#listing-input");

  const initialQuery = new URLSearchParams(location.search).get("q") ?? "";
  input.value = initialQuery;

  try {
    genreMap = new Map((await getGenres()).map((g) => [g.id, g.name]));
  } catch {
    /* los nombres de género son decorativos */
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();

    // Actualiza la URL sin recargar (para poder compartir/recargar el enlace).
    const url = new URL(location.href);
    url.searchParams.set("q", query);
    history.replaceState(null, "", url);

    runSearch(query);
  });

  runSearch(initialQuery);
}

init();
