// js/modules/series-page.js · pages/series.html?tab=popular|trending|onair
// Catálogo de series de TV (solo explorar, sin reservas).

import "../components/site-header.js";
import "../components/site-footer.js";

import {
  getPopularTv,
  getTrendingTv,
  getOnAirTv,
  getTvGenres,
} from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setEmpty, setReady } from "../ui/states.js";
import { createTvCard } from "../ui/render.js";

const TABS = {
  popular: { fetch: getPopularTv },
  trending: { fetch: getTrendingTv },
  onair: { fetch: getOnAirTv },
};

let genreMap = new Map();

async function loadTab(tab) {
  const grid = $("#series-grid");
  const key = tab in TABS ? tab : "popular";
  markActive(key);
  setLoading(grid, "Cargando series…");

  try {
    const shows = (await TABS[key].fetch()).filter((s) => s.poster_path);
    const unique = [...new Map(shows.map((s) => [s.id, s])).values()];

    if (unique.length === 0) {
      setEmpty(grid, "No hay series en esta sección.");
      return;
    }
    grid.replaceChildren(...unique.map((s) => createTvCard(s, { genreMap })));
    setReady(grid);
  } catch {
    setError(grid, "No se pudieron cargar las series.", () => loadTab(key));
  }
}

function markActive(tab) {
  for (const chip of $("#series-tabs").children) {
    chip.classList.toggle("is-active", chip.dataset.tab === tab);
  }
}

async function init() {
  const nav = $("#series-tabs");
  const current = new URLSearchParams(location.search).get("tab") || "popular";

  try {
    genreMap = new Map((await getTvGenres()).map((g) => [g.id, g.name]));
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
