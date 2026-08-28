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

// Rutas a las fichas, válidas desde "/" o desde "/pages/".
const moviePath = (id) => sitePath(`pages/movie.html?id=${id}`);
const tvPath = (id) => sitePath(`pages/tv.html?id=${id}`);

/**
 * Tarjeta base de póster (película o serie). Sin <template>, funciona en cualquier página.
 * @param {object} item     objeto de TMDB
 * @param {object} opts
 * @param {string} opts.href       destino al hacer clic
 * @param {string} opts.title
 * @param {string} opts.metaText
 * @param {number} opts.rating
 * @param {string} [opts.posterPath]
 * @param {string} [opts.badge]
 */
function buildPosterCard({ href, title, metaText, rating, posterPath, badge }) {
  const article = document.createElement("article");
  article.className = "movie-card";
  article.innerHTML = `
    <a class="movie-card__link">
      <div class="movie-card__poster">
        <img class="movie-card__img" loading="lazy" />
        <span class="badge movie-card__badge" hidden></span>
      </div>
      <div class="movie-card__body">
        <h3 class="movie-card__title"></h3>
        <p class="movie-card__meta"></p>
        <p class="movie-card__rating"></p>
      </div>
    </a>
  `;

  article.querySelector(".movie-card__link").href = href;

  const img = article.querySelector(".movie-card__img");
  img.src = imageUrl(posterPath, "w342") || POSTER_PLACEHOLDER;
  img.alt = `Póster de ${title}`;

  article.querySelector(".movie-card__title").textContent = title;
  article.querySelector(".movie-card__meta").textContent = metaText;
  article.querySelector(".movie-card__rating").textContent = formatRating(rating);

  if (badge) {
    const badgeEl = article.querySelector(".movie-card__badge");
    badgeEl.textContent = badge;
    badgeEl.hidden = false;
  }

  return article;
}

/** Tarjeta de PELÍCULA (Now Showing / Coming Soon / Search / Category / ficha de actor). */
export function createMovieCard(movie, { genreMap, badge } = {}) {
  const title = movie.title ?? movie.name ?? "Sin título";
  const genres = genreNames(movie, genreMap).slice(0, 2).join(" · ");
  return buildPosterCard({
    href: moviePath(movie.id),
    title,
    metaText: genres || formatYear(movie.release_date),
    rating: movie.vote_average,
    posterPath: movie.poster_path,
    badge,
  });
}

/** Tarjeta de SERIE de TV. */
export function createTvCard(show, { genreMap, badge } = {}) {
  const title = show.name ?? "Serie";
  const genres = genreNames(show, genreMap).slice(0, 2).join(" · ");
  return buildPosterCard({
    href: tvPath(show.id),
    title,
    metaText: genres || formatYear(show.first_air_date),
    rating: show.vote_average,
    posterPath: show.poster_path,
    badge,
  });
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

/**
 * Tarjeta de una persona del reparto. Template-free (funciona en movie.html y
 * tv.html). En la feature de filmografía se convierte en enlace a person.html.
 * @param {object} person  objeto de credits.cast (película) o aggregate_credits (TV)
 */
export function createCastCard(person) {
  const li = document.createElement("li");
  li.className = "cast-card";
  li.innerHTML = `
    <img class="cast-card__img" loading="lazy" />
    <span class="cast-card__name"></span>
    <span class="cast-card__role"></span>
  `;

  const img = li.querySelector(".cast-card__img");
  img.src = imageUrl(person.profile_path, "w185") || POSTER_PLACEHOLDER;
  img.alt = person.name ?? "";

  li.querySelector(".cast-card__name").textContent = person.name ?? "";
  // credits de película: person.character ; aggregate_credits de TV: person.roles[0].character
  li.querySelector(".cast-card__role").textContent =
    person.character ?? person.roles?.[0]?.character ?? "";

  return li;
}
