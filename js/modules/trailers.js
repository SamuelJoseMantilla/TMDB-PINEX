// js/modules/trailers.js
// Sección "Featured Trailers" + reproducción de cualquier trailer en el modal.

import { getNowPlaying, getMovieVideos, imageUrl } from "../services/tmdb.service.js";
import { pickTrailer } from "../utils/helpers.js";
import { $, $$ } from "../utils/dom.js";
import { setError } from "../ui/states.js";
import { createTrailerThumb } from "../ui/render.js";

const FEATURE_COUNT = 4; // 1 destacado + 3 miniaturas

/* --------------------------- reproducción en modal --------------------- */

function youTubeEmbed(key) {
  const wrap = document.createElement("div");
  wrap.className = "video-embed";

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube.com/embed/${key}?autoplay=1&rel=0`;
  iframe.title = "Trailer";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";

  wrap.append(iframe);
  return wrap;
}

/** Abre el modal con el trailer de YouTube indicado. */
export function playTrailer(youtubeKey) {
  if (!youtubeKey) return;
  const modal = $("#trailer-modal");
  if (!modal) return;
  modal.setContent(youTubeEmbed(youtubeKey));
  modal.open();
}

/**
 * Busca el trailer de una película y lo reproduce.
 * Lo usa el botón "Watch Trailer" del Hero.
 */
export async function playMovieTrailer(movieId) {
  try {
    const videos = await getMovieVideos(movieId);
    const trailer = pickTrailer(videos);
    if (trailer) playTrailer(trailer.key);
  } catch {
    /* si no hay trailer, no hacemos nada */
  }
}

/* --------------------------- sección de la home ----------------------- */

export async function initTrailers() {
  const feature = $("#trailer-feature");
  const list = $("#trailer-list");
  if (!feature || !list) return;

  try {
    const movies = (await getNowPlaying()).slice(0, FEATURE_COUNT);

    // Para cada película, su mejor trailer (en paralelo).
    const withTrailers = await Promise.all(
      movies.map(async (movie) => {
        const videos = await getMovieVideos(movie.id).catch(() => []);
        const trailer = pickTrailer(videos);
        return trailer ? { movie, trailer } : null;
      })
    );

    const available = withTrailers.filter(Boolean);
    if (available.length === 0) {
      list.replaceChildren();
      setError(list, "No trailers available right now.");
      return;
    }

    renderFeature(feature, available[0]);
    renderThumbs(list, available.slice(1));
  } catch (error) {
    setError(list, "Couldn't load trailers.", initTrailers);
  }
}

function renderFeature(feature, { movie, trailer }) {
  feature.style.backgroundImage = movie.backdrop_path
    ? `url("${imageUrl(movie.backdrop_path, "w1280")}")`
    : "";
  feature.dataset.state = "ready";

  const playBtn = feature.querySelector(".trailer-feature__play");
  playBtn.dataset.trailerKey = trailer.key;
  playBtn.hidden = false;
  playBtn.addEventListener("click", () => playTrailer(trailer.key));

  feature.querySelector("[data-trailer-title]").textContent = movie.title;
  feature.querySelector("[data-trailer-meta]").textContent = trailer.name;
}

function renderThumbs(list, items) {
  list.dataset.state = "ready";
  list.replaceChildren(
    ...items.map(({ movie, trailer }) =>
      createTrailerThumb({ ...trailer, movieTitle: movie.title })
    )
  );

  // Delegación de eventos: un solo listener para todas las miniaturas.
  list.addEventListener("click", (event) => {
    const button = event.target.closest(".trailer-thumb__button");
    if (button) playTrailer(button.dataset.trailerKey);
  });
}
