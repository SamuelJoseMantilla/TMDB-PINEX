// js/modules/tv-details.js · pages/tv.html?id=<tvId>
// Ficha de una serie de TV (solo información de TMDB, sin reservas).

import "../components/site-header.js";
import "../components/site-footer.js";
import "../components/app-modal.js";

import {
  getTvDetails,
  getTvCredits,
  getTvVideos,
  imageUrl,
} from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setError } from "../ui/states.js";
import { playTrailer } from "./trailers.js";
import { createCastCard } from "../ui/render.js";
import { createFavoriteButton } from "../ui/favorite-button.js";
import {
  formatRating,
  formatReleaseDate,
  formatYear,
  pickTrailer,
  POSTER_PLACEHOLDER,
} from "../utils/helpers.js";

const tvId = new URLSearchParams(location.search).get("id");

async function init() {
  const main = $("#main");

  if (!tvId) {
    setError(main, "No se indicó ninguna serie.");
    return;
  }

  try {
    const [show, credits, videos] = await Promise.all([
      getTvDetails(tvId),
      getTvCredits(tvId).catch(() => ({ cast: [] })),
      getTvVideos(tvId).catch(() => []),
    ]);

    document.title = `${show.name} · CINEHUB`;
    render(main, { show, credits, videos });
  } catch {
    setError(main, "No se pudo cargar la serie.", init);
  }
}

function render(main, { show, credits, videos }) {
  const trailer = pickTrailer(videos);
  const creator = show.created_by?.[0];
  const genres = show.genres?.map((g) => g.name).join(" · ") || "";
  const seasons = show.number_of_seasons
    ? `${show.number_of_seasons} temporada${show.number_of_seasons === 1 ? "" : "s"}`
    : "";

  main.dataset.state = "ready";
  main.innerHTML = `
    <section class="movie-hero">
      <div class="movie-hero__backdrop"></div>
      <div class="movie-hero__overlay"></div>

      <div class="movie-hero__inner container">
        <img class="movie-hero__poster"
             src="${imageUrl(show.poster_path, "w500") || POSTER_PLACEHOLDER}"
             alt="Póster de ${show.name}" />

        <div class="movie-hero__info">
          <h1 class="movie-hero__title">${show.name}</h1>
          ${show.tagline ? `<p class="movie-hero__tagline">${show.tagline}</p>` : ""}

          <ul class="movie-hero__meta">
            ${show.vote_average ? `<li class="movie-hero__rating">${formatRating(show.vote_average)}</li>` : ""}
            ${seasons ? `<li>${seasons}</li>` : ""}
            ${genres ? `<li>${genres}</li>` : ""}
            ${show.first_air_date ? `<li>${formatYear(show.first_air_date)}${
              show.last_air_date && show.status === "Ended"
                ? "–" + formatYear(show.last_air_date)
                : ""
            }</li>` : ""}
          </ul>

          <p class="movie-hero__overview">${show.overview || "Sinopsis no disponible."}</p>

          ${creator ? `<p class="movie-hero__crew"><span>Creada por</span> ${creator.name}</p>` : ""}

          <div class="movie-hero__actions">
            <button type="button" class="button button--primary" data-trailer ${trailer ? "" : "disabled"}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              Ver trailer
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
  `;

  if (show.backdrop_path) {
    main.querySelector(".movie-hero__backdrop").style.backgroundImage =
      `url("${imageUrl(show.backdrop_path, "w1280")}")`;
  }

  if (trailer) {
    main.querySelector("[data-trailer]").addEventListener("click", () => playTrailer(trailer.key));
  }

  main.querySelector(".movie-hero__actions").append(
    createFavoriteButton({
      mediaType: "tv",
      tmdbId: show.id,
      title: show.name,
      posterPath: show.poster_path,
    })
  );

  renderCast(main.querySelector("#cast-list"), credits.cast ?? []);
}

function renderCast(list, cast) {
  if (cast.length === 0) {
    list.innerHTML = `<li class="state">Reparto no disponible.</li>`;
    return;
  }
  list.replaceChildren(...cast.slice(0, 14).map(createCastCard));
}

init();
