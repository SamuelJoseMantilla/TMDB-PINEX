// js/modules/movies-page.js · pages/movies.html?tab=now|trending|upcoming
// Cartelera completa con pestañas.

import "../components/site-header.js";
import "../components/site-footer.js";

import {
  getNowPlaying,
  getTrending,
  getUpcoming,
  getGenres,
} from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setEmpty, setReady } from "../ui/states.js";
import { createMovieCard } from "../ui/render.js";

const TABS = {
  now: { label: "En cartelera", fetch: () => pages(getNowPlaying, 2) },
  trending: { label: "Tendencia", fetch: () => getTrending() },
  upcoming: {
    label: "Próximamente",
    fetch: async () => {
      const today = new Date().toISOString().slice(0, 10);
      return (await pages(getUpcoming, 2))
        .filter((m) => m.release_date && m.release_date > today)
        .sort((a, b) => a.release_date.localeCompare(b.release_date));
    },
  },
};

let genreMap = new Map();

/** Junta varias páginas del mismo endpoint. */
async function pages(fetcher, count) {
  const all = await Promise.all(
    Array.from({ length: count }, (_, i) => fetcher(i + 1))
  );
  return all.flat();
}

async function loadTab(tab) {
  const grid = $("#movies-grid");
  const config = TABS[tab] ?? TABS.now;

  markActive(tab in TABS ? tab : "now");
  setLoading(grid, "Cargando películas…");

  try {
    const movies = (await config.fetch()).filter((m) => m.poster_path);
    // quitar duplicados por id
    const unique = [...new Map(movies.map((m) => [m.id, m])).values()];

    if (unique.length === 0) {
      setEmpty(grid, "No hay películas en esta sección.");
      return;
    }
    grid.replaceChildren(...unique.map((m) => createMovieCard(m, { genreMap })));
    setReady(grid);
  } catch {
    setError(grid, "No se pudieron cargar las películas.", () => loadTab(tab));
  }
}

function markActive(tab) {
  for (const chip of $("#movies-tabs").children) {
    chip.classList.toggle("is-active", chip.dataset.tab === tab);
  }
}

async function init() {
  const nav = $("#movies-tabs");
  const current = new URLSearchParams(location.search).get("tab") || "now";

  try {
    genreMap = new Map((await getGenres()).map((g) => [g.id, g.name]));
  } catch {
    /* decorativo */
  }

  nav.addEventListener("click", (event) => {
    const chip = event.target.closest(".genre-chip");
    if (!chip) return;
    event.preventDefault();
    const url = new URL(location.href);
    url.searchParams.set("tab", chip.dataset.tab);
    history.replaceState(null, "", url);
    loadTab(chip.dataset.tab);
  });

  loadTab(current);
}

init();
