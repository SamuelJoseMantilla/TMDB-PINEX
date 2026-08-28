// js/modules/category.js
// Página de categorías: pages/category.html?genre=<genreId>

import "../components/site-header.js";
import "../components/site-footer.js";

import { getGenres, getMoviesByGenre } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setEmpty, setReady } from "../ui/states.js";
import { createMovieCard } from "../ui/render.js";

const DEFAULT_GENRE = "28"; // Acción

let genres = [];
let genreMap = new Map();

async function loadGenre(genreId) {
  const grid = $("#results-grid");
  const title = $("#listing-title");

  const name = genreMap.get(Number(genreId));
  title.textContent = name ? `Categoría · ${name}` : "Categorías";
  renderChips(genreId);

  setLoading(grid, "Cargando películas…");
  try {
    const movies = (await getMoviesByGenre(genreId)).filter((m) => m.poster_path);
    if (movies.length === 0) {
      setEmpty(grid, "No hay películas en esta categoría.");
      return;
    }
    grid.replaceChildren(...movies.map((movie) => createMovieCard(movie, { genreMap })));
    setReady(grid);
  } catch {
    setError(grid, "No se pudo cargar la categoría.", () => loadGenre(genreId));
  }
}

function renderChips(activeId) {
  const nav = $("#genre-chips");
  nav.replaceChildren(
    ...genres.map((genre) => {
      const chip = document.createElement("a");
      chip.className = "genre-chip" + (String(genre.id) === String(activeId) ? " is-active" : "");
      chip.href = `category.html?genre=${genre.id}`;
      chip.dataset.genreId = genre.id;
      chip.textContent = genre.name;
      return chip;
    })
  );
}

async function init() {
  const nav = $("#genre-chips");
  const current = new URLSearchParams(location.search).get("genre") || DEFAULT_GENRE;

  try {
    genres = await getGenres();
    genreMap = new Map(genres.map((g) => [g.id, g.name]));
  } catch {
    setError($("#results-grid"), "No se pudieron cargar las categorías.", init);
    return;
  }

  // Cambiar de categoría sin recargar la página.
  nav.addEventListener("click", (event) => {
    const chip = event.target.closest(".genre-chip");
    if (!chip) return;
    event.preventDefault();

    const genreId = chip.dataset.genreId;
    const url = new URL(location.href);
    url.searchParams.set("genre", genreId);
    history.replaceState(null, "", url);

    loadGenre(genreId);
  });

  loadGenre(current);
}

init();
