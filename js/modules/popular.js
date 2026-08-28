// js/modules/popular.js
// Sección "Popular at CINEHUB" de la Homepage.
//
// NO usa TMDB para el ranking: usa DATOS PROPIOS (reservations). Agrupa por
// tmdbId, suma boletos, ordena, y toma el Top 3. El póster/título sí se piden
// a TMDB, solo para pintar.

import { getAll } from "../services/api.service.js";
import { getMovieDetails, imageUrl } from "../services/tmdb.service.js";
import { $, cloneTemplate } from "../utils/dom.js";
import { setError, setEmpty, setReady } from "../ui/states.js";
import { POSTER_PLACEHOLDER, sitePath } from "../utils/helpers.js";

const LABELS = ["Most Booked", "Trending Locally", "Fan Favorite"];

export async function initPopular() {
  const list = $("#popular-list");
  if (!list) return;

  try {
    const reservations = await getAll("reservations");

    // 1-4: agrupar por película y contar boletos (ignorando canceladas)
    const ticketsByMovie = new Map();
    for (const r of reservations) {
      if (r.status === "cancelled") continue;
      const count = r.quantity ?? r.seatCodes?.length ?? 0;
      ticketsByMovie.set(r.tmdbId, (ticketsByMovie.get(r.tmdbId) ?? 0) + count);
    }

    // 5: ordenar de mayor a menor y quedarnos con el Top 3
    const top = [...ticketsByMovie.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (top.length === 0) {
      setEmpty(list, "Aún no hay reservas suficientes para calcular esto.");
      return;
    }

    // 6: info visual de cada película desde TMDB
    const movies = await Promise.all(
      top.map(([tmdbId]) => getMovieDetails(tmdbId).catch(() => null))
    );

    list.replaceChildren(
      ...top.map(([tmdbId, tickets], i) => renderItem(movies[i], tmdbId, tickets, i))
    );
    setReady(list);
  } catch {
    setError(list, "No se pudo calcular esta sección.", initPopular);
  }
}

function renderItem(movie, tmdbId, tickets, index) {
  const li = cloneTemplate("tpl-popular-item");

  li.querySelector(".popular-item__rank").textContent = index + 1;

  const img = li.querySelector(".popular-item__img");
  img.src = (movie && imageUrl(movie.poster_path, "w185")) || POSTER_PLACEHOLDER;
  img.alt = "";

  li.querySelector(".popular-item__title").textContent = movie?.title ?? "Película";
  li.querySelector(".popular-item__badge").textContent = LABELS[index] ?? "Popular";
  li.querySelector(".popular-item__count").textContent =
    `${tickets} ${tickets === 1 ? "boleto" : "boletos"}`;

  li.classList.add("popular-item--link");
  li.addEventListener("click", () => {
    window.location.href = sitePath(`pages/movie.html?id=${tmdbId}`);
  });

  return li;
}
