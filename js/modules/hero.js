// js/modules/hero.js
// Hero de la Homepage: película destacada con backdrop, metadatos y acciones.

import { getMovieDetails, getNowPlaying, imageUrl } from "../services/tmdb.service.js";
import { FEATURED_MOVIE_ID } from "../config.js";
import { $ } from "../utils/dom.js";
import { formatRuntime, formatRating, formatYear } from "../utils/helpers.js";
import { playMovieTrailer } from "./trailers.js";

export async function initHero() {
  const hero = $("#hero");
  if (!hero) return;

  try {
    const movie = await loadFeaturedMovie();
    renderHero(hero, movie);
  } catch (error) {
    // El Hero nunca debe romper la página: dejamos un estado digno.
    $("[data-hero-title]").textContent = "CINEHUB";
    $("[data-hero-meta]").hidden = true;
    hero.querySelector(".hero__eyebrow").textContent = "Bienvenido";
  }
}

/**
 * Intenta la película configurada; si falla, usa la primera de "Now Playing".
 */
async function loadFeaturedMovie() {
  try {
    return await getMovieDetails(FEATURED_MOVIE_ID);
  } catch {
    const nowPlaying = await getNowPlaying();
    return getMovieDetails(nowPlaying[0].id);
  }
}

function renderHero(hero, movie) {
  const backdrop = hero.querySelector("[data-hero-backdrop]");
  if (movie.backdrop_path) {
    backdrop.style.backgroundImage = `url("${imageUrl(movie.backdrop_path, "w1280")}")`;
  }

  hero.querySelector("[data-hero-title]").textContent = movie.title;

  hero.querySelector("[data-hero-rating]").textContent = formatRating(movie.vote_average) || "★ –";
  hero.querySelector("[data-hero-runtime]").textContent = formatRuntime(movie.runtime) || "–";
  hero.querySelector("[data-hero-genres]").textContent =
    movie.genres?.slice(0, 2).map((g) => g.name).join(" / ") || "–";
  hero.querySelector("[data-hero-year]").textContent = formatYear(movie.release_date) || "–";

  hero.querySelector("[data-hero-overview]").textContent = movie.overview ?? "";

  // Buy Tickets -> por ahora a la ficha de la película (flujo de reserva en Fase 12+)
  hero.querySelector("[data-hero-buy]").href = `pages/movie.html?id=${movie.id}`;

  // Watch Trailer -> abre el modal con el trailer de esta película
  hero.querySelector("[data-hero-trailer]").addEventListener("click", () => {
    playMovieTrailer(movie.id);
  });
}
