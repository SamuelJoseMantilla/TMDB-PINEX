// js/modules/movie-details.js
// Página de detalle: pages/movie.html?id=<tmdbId>
//
// Combina:
//   - TMDB      -> detalles, reparto, director, trailers
//   - JSON Server -> funciones (showtimes) de ESTA película en el cine

import "../components/site-header.js";
import "../components/site-footer.js";
import "../components/app-modal.js";

import {
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  imageUrl,
} from "../services/tmdb.service.js";
import { getAll } from "../services/api.service.js";
import { $ } from "../utils/dom.js";
import { setError } from "../ui/states.js";
import { playTrailer } from "./trailers.js";
import { createCastCard } from "../ui/render.js";
import { createFavoriteButton } from "../ui/favorite-button.js";
import { mountReviews } from "../ui/reviews.js";
import {
  formatRuntime,
  formatRating,
  formatReleaseDate,
  formatYear,
  formatMoney,
  dateOptionLabel,
  pickTrailer,
  POSTER_PLACEHOLDER,
} from "../utils/helpers.js";

const movieId = new URLSearchParams(location.search).get("id");

async function init() {
  const main = $("#main");

  if (!movieId) {
    setError(main, "No se indicó ninguna película.");
    return;
  }

  try {
    const [movie, credits, videos, functions, rooms] = await Promise.all([
      getMovieDetails(movieId),
      getMovieCredits(movieId).catch(() => ({ cast: [], crew: [] })),
      getMovieVideos(movieId).catch(() => []),
      getAll("functions", { tmdbId: movieId }).catch(() => []),
      getAll("rooms").catch(() => []),
    ]);

    document.title = `${movie.title} · CINEHUB`;
    render(main, { movie, credits, videos, functions, rooms });
  } catch {
    setError(main, "No se pudo cargar la película.", init);
  }
}

function render(main, { movie, credits, videos, functions, rooms }) {
  const director = credits.crew?.find((p) => p.job === "Director");
  const trailer = pickTrailer(videos);
  const genres = movie.genres?.map((g) => g.name).join(" · ") || "";

  main.dataset.state = "ready";
  main.innerHTML = `
    <section class="movie-hero">
      <div class="movie-hero__backdrop"></div>
      <div class="movie-hero__overlay"></div>

      <div class="movie-hero__inner container">
        <img class="movie-hero__poster" src="${
          imageUrl(movie.poster_path, "w500") || POSTER_PLACEHOLDER
        }" alt="Póster de ${movie.title}" />

        <div class="movie-hero__info">
          <h1 class="movie-hero__title">${movie.title}</h1>
          ${movie.tagline ? `<p class="movie-hero__tagline">${movie.tagline}</p>` : ""}

          <ul class="movie-hero__meta">
            ${movie.vote_average ? `<li class="movie-hero__rating">${formatRating(movie.vote_average)}</li>` : ""}
            ${movie.runtime ? `<li>${formatRuntime(movie.runtime)}</li>` : ""}
            ${genres ? `<li>${genres}</li>` : ""}
            ${movie.release_date ? `<li>${formatReleaseDate(movie.release_date)}</li>` : ""}
          </ul>

          <p class="movie-hero__overview">${movie.overview || "Sinopsis no disponible."}</p>

          ${director ? `<p class="movie-hero__crew"><span>Dirección</span> ${director.name}</p>` : ""}

          <div class="movie-hero__actions">
            <a class="button button--primary" href="#showtimes">Buy Tickets</a>
            <button type="button" class="button button--ghost" data-trailer ${trailer ? "" : "disabled"}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              Watch Trailer
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="section movie-cast" aria-labelledby="cast-title">
      <div class="section__head container">
        <h2 class="section__title" id="cast-title">Reparto</h2>
      </div>
      <ul class="cast-list container" id="cast-list"></ul>
    </section>

    <section class="section section--surface movie-showtimes" id="showtimes" aria-labelledby="showtimes-title">
      <div class="section__head container">
        <h2 class="section__title" id="showtimes-title">Showtimes</h2>
      </div>
      <div class="container" id="showtimes-body"></div>
    </section>

    <section class="section" id="reviews" aria-labelledby="reviews-title">
      <div class="section__head container">
        <h2 class="section__title" id="reviews-title">Reseñas</h2>
      </div>
      <div class="container" id="reviews-body"></div>
    </section>
  `;

  // Backdrop de fondo
  if (movie.backdrop_path) {
    main.querySelector(".movie-hero__backdrop").style.backgroundImage =
      `url("${imageUrl(movie.backdrop_path, "w1280")}")`;
  }

  // Botón de trailer
  if (trailer) {
    main.querySelector("[data-trailer]").addEventListener("click", () => playTrailer(trailer.key));
  }

  // Botón de favorito
  main.querySelector(".movie-hero__actions").append(
    createFavoriteButton({
      mediaType: "movie",
      tmdbId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
    })
  );

  renderCast(main.querySelector("#cast-list"), credits.cast ?? []);
  renderShowtimes(main.querySelector("#showtimes-body"), functions, rooms);
  mountReviews(main.querySelector("#reviews-body"), { mediaType: "movie", tmdbId: movie.id });
}

function renderCast(list, cast) {
  if (cast.length === 0) {
    list.innerHTML = `<li class="state">Reparto no disponible.</li>`;
    return;
  }
  list.replaceChildren(...cast.slice(0, 14).map(createCastCard));
}

function renderShowtimes(body, functions, rooms) {
  if (functions.length === 0) {
    body.innerHTML = `<p class="state">No hay funciones programadas para esta película en CINEHUB.</p>`;
    return;
  }

  const roomName = (id) => rooms.find((r) => r.id === id)?.name ?? id;

  // Agrupar por fecha y ordenar
  const byDate = new Map();
  for (const fn of functions) {
    if (!byDate.has(fn.date)) byDate.set(fn.date, []);
    byDate.get(fn.date).push(fn);
  }
  const days = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  body.innerHTML = days
    .map(
      ([date, fns]) => `
      <div class="showtime-day">
        <h3 class="showtime-day__date">${dateOptionLabel(date)}</h3>
        <ul class="showtime-list">
          ${fns
            .sort((a, b) => a.time.localeCompare(b.time))
            .map(
              (fn) => `
              <li>
                <a class="showtime" href="booking.html?functionId=${fn.id}">
                  <span class="showtime__time">${fn.time}</span>
                  <span class="showtime__room">${roomName(fn.roomId)} · ${fn.format}</span>
                  <span class="showtime__price">${formatMoney(fn.price)}</span>
                </a>
              </li>`
            )
            .join("")}
        </ul>
      </div>`
    )
    .join("");
}

init();
