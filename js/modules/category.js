// js/modules/category.js
// Página de categorías: pages/category.html?genre=<genreId>&sort=<criterio>

import "../components/site-header.js";
import "../components/site-footer.js";

import { getGenres, getMoviesByGenre } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setEmpty, setReady } from "../ui/states.js";
import { createMovieCard } from "../ui/render.js";

const DEFAULT_GENRE = "28"; // Acción
const DEFAULT_SORT = "relevance";

// Cada criterio es una función de comparación para Array.prototype.sort.
// "relevance" no ordena: deja el orden que ya trae TMDB (por popularidad).
const SORTERS = {
  relevance: null,
  az: (a, b) => title(a).localeCompare(title(b), "es"),
  za: (a, b) => title(b).localeCompare(title(a), "es"),
  "rating-desc": (a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0),
  "rating-asc": (a, b) => (a.vote_average ?? 0) - (b.vote_average ?? 0),
};

const title = (movie) => movie.title ?? movie.name ?? "";

let genres = [];
let genreMap = new Map();
let currentMovies = []; // las películas del género actual, sin ordenar

/** Ordena una copia de currentMovies según el <select> y re-pinta la rejilla. */
function renderGrid() {
  const grid = $("#results-grid");
  const sorter = SORTERS[$("#sort-select").value] ?? null;

  const movies = sorter ? [...currentMovies].sort(sorter) : currentMovies;

  grid.replaceChildren(...movies.map((movie) => createMovieCard(movie, { genreMap })));
  setReady(grid);
}

async function loadGenre(genreId) {
  const grid = $("#results-grid");
  const heading = $("#listing-title");

  const name = genreMap.get(Number(genreId));
  heading.textContent = name ? `Categoría · ${name}` : "Categorías";
  renderChips(genreId);

  setLoading(grid, "Cargando películas…");
  try {
    currentMovies = (await getMoviesByGenre(genreId)).filter((m) => m.poster_path);
    if (currentMovies.length === 0) {
      setEmpty(grid, "No hay películas en esta categoría.");
      return;
    }
    renderGrid();
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
  const sortSelect = $("#sort-select");
  const params = new URLSearchParams(location.search);
  const currentGenre = params.get("genre") || DEFAULT_GENRE;

  // El <select> arranca con lo que diga la URL (?sort=), si es un valor válido.
  const sortFromUrl = params.get("sort");
  if (sortFromUrl && sortFromUrl in SORTERS) sortSelect.value = sortFromUrl;

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
    updateUrl({ genre: genreId });
    loadGenre(genreId);
  });

  // Cambiar el orden: no vuelve a llamar a TMDB, solo reordena lo que ya hay.
  sortSelect.addEventListener("change", () => {
    updateUrl({ sort: sortSelect.value });
    if (currentMovies.length > 0) renderGrid();
  });

  loadGenre(currentGenre);
}

/** Refleja el estado (género / orden) en la URL para poder compartirla. */
function updateUrl(patch) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value === DEFAULT_SORT) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  history.replaceState(null, "", url);
}

init();
