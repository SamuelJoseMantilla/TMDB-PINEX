// js/ui/render.js
// Construye elementos del DOM a partir de los <template> de index.html y de los
// datos de TMDB. Devuelve nodos listos para insertar; no toca el documento.

import { cloneTemplate } from "../utils/dom.js";
import { imageUrl } from "../services/tmdb.service.js";
import {
  formatRating,
  formatYear,
  genreNames,
  sitePath,
  POSTER_PLACEHOLDER,
} from "../utils/helpers.js";

// Ruta a la ficha de una película, válida desde "/" o desde "/pages/".
const moviePath = (id) => sitePath(`pages/movie.html?id=${id}`);

/**
 * Tarjeta de película para Now Showing / Coming Soon.
 * @param {object} movie      objeto de TMDB (endpoint de lista)
 * @param {object} [options]
 * @param {Map}    [options.genreMap]  id de género -> nombre
 * @param {string} [options.badge]     texto de la etiqueta (ej. "Soon")
 */
export function createMovieCard(movie, { genreMap, badge } = {}) {
  const card = cloneTemplate("tpl-movie-card");

  const link = card.querySelector(".movie-card__link");
  const img = card.querySelector(".movie-card__img");
  const title = card.querySelector(".movie-card__title");
  const meta = card.querySelector(".movie-card__meta");
  const rating = card.querySelector(".movie-card__rating");
  const badgeEl = card.querySelector(".movie-card__badge");

  link.href = moviePath(movie.id);
  img.src = imageUrl(movie.poster_path, "w342") || POSTER_PLACEHOLDER;
  img.alt = movie.title ? `Póster de ${movie.title}` : "";
  title.textContent = movie.title ?? movie.name ?? "Sin título";

  const genres = genreNames(movie, genreMap).slice(0, 2).join(" · ");
  meta.textContent = genres || formatYear(movie.release_date);
  rating.textContent = formatRating(movie.vote_average);

  if (badge) {
    badgeEl.textContent = badge;
    badgeEl.hidden = false;
  }

  return card;
}

/** Ítem de Trending, con número de ranking. */
export function createTrendingItem(movie, rank, genreMap) {
  const item = cloneTemplate("tpl-trending-item");

  item.querySelector(".trending-item__rank").textContent = `#${rank}`;

  const link = item.querySelector(".trending-item__link");
  link.href = moviePath(movie.id);

  const img = item.querySelector(".trending-item__img");
  img.src = imageUrl(movie.poster_path, "w185") || POSTER_PLACEHOLDER;
  img.alt = "";

  item.querySelector(".trending-item__title").textContent = movie.title ?? movie.name;
  item.querySelector(".trending-item__rating").textContent = formatRating(movie.vote_average);
  item.querySelector(".trending-item__genre").textContent = genreNames(movie, genreMap)
    .slice(0, 2)
    .join(" · ");

  return item;
}

/**
 * Miniatura de trailer secundario.
 * @param {object} video  objeto de /movie/{id}/videos (site YouTube)
 */
export function createTrailerThumb(video) {
  const li = cloneTemplate("tpl-trailer-thumb");

  const button = li.querySelector(".trailer-thumb__button");
  button.dataset.trailerKey = video.key;
  button.dataset.trailerTitle = video.movieTitle ?? video.name;

  const img = li.querySelector(".trailer-thumb__img");
  img.src = `https://i.ytimg.com/vi/${video.key}/mqdefault.jpg`;
  img.alt = "";

  li.querySelector(".trailer-thumb__title").textContent = video.movieTitle ?? video.name;
  li.querySelector(".trailer-thumb__duration").textContent = video.type; // Trailer / Teaser

  return li;
}
