// js/modules/surprise.js
// Sección "Don't know what to watch?" — elige una película al azar con una
// animación de selección (tipo tragaperras) hecha solo con JavaScript.

import { getNowPlaying, getTrending, imageUrl } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { POSTER_PLACEHOLDER } from "../utils/helpers.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// El pool se pide una sola vez y se reutiliza en cada "surprise me again".
let moviePool = null;

async function getPool() {
  if (moviePool) return moviePool;

  const [nowPlaying, trending] = await Promise.all([getNowPlaying(), getTrending()]);
  const byId = new Map();
  for (const movie of [...nowPlaying, ...trending]) {
    if (movie.poster_path) byId.set(movie.id, movie);
  }
  moviePool = [...byId.values()];
  return moviePool;
}

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

export function initSurprise() {
  const button = $("#surprise-btn");
  const result = $("#surprise-result");
  if (!button || !result) return;

  const reveal = buildReveal();
  result.replaceChildren(reveal.root);

  async function run() {
    button.disabled = true;
    button.textContent = "Elegimos…";
    result.hidden = false;
    reveal.root.classList.add("is-spinning");
    reveal.actions.hidden = true;
    reveal.again.hidden = true;
    reveal.label.textContent = "Elegimos por ti…";
    reveal.title.textContent = "";

    try {
      const pool = await getPool();
      if (pool.length === 0) throw new Error("pool vacío");

      const chosen = prefersReducedMotion ? randomOf(pool) : await spin(pool, reveal);
      showFinal(chosen, reveal);
    } catch {
      reveal.label.textContent = "No pudimos elegir. Inténtalo de nuevo.";
    } finally {
      reveal.root.classList.remove("is-spinning");
      button.disabled = false;
      button.textContent = "Surprise me";
    }
  }

  button.addEventListener("click", run);
  reveal.again.addEventListener("click", run);
}

/**
 * Anima los posters cambiando cada vez más despacio y devuelve la película final.
 * @returns {Promise<object>}
 */
function spin(pool, reveal) {
  return new Promise((resolve) => {
    const TICKS = 20;
    let tick = 0;

    const step = () => {
      const movie = randomOf(pool);
      reveal.img.src = imageUrl(movie.poster_path, "w342") || POSTER_PLACEHOLDER;
      reveal.title.textContent = movie.title;
      tick += 1;

      if (tick >= TICKS) {
        resolve(randomOf(pool));
        return;
      }
      // El retardo crece con cada tick -> sensación de frenado.
      setTimeout(step, 55 + tick * tick * 1.1);
    };

    step();
  });
}

function showFinal(movie, reveal) {
  reveal.img.src = imageUrl(movie.poster_path, "w500") || POSTER_PLACEHOLDER;
  reveal.img.alt = `Póster de ${movie.title}`;
  reveal.title.textContent = movie.title;
  reveal.label.textContent = "Your movie is…";
  reveal.viewMovie.href = `pages/movie.html?id=${movie.id}`;
  reveal.viewShowtimes.href = `pages/movie.html?id=${movie.id}#showtimes`;
  reveal.actions.hidden = false;
  reveal.again.hidden = false;
}

function buildReveal() {
  const root = document.createElement("div");
  root.className = "surprise-reveal";
  root.innerHTML = `
    <p class="surprise-reveal__label"></p>
    <div class="surprise-reveal__poster">
      <img class="surprise-reveal__img" src="${POSTER_PLACEHOLDER}" alt="" />
    </div>
    <h3 class="surprise-reveal__title"></h3>
    <div class="surprise-reveal__actions" hidden>
      <a class="button button--primary" data-view-movie href="#">View Movie</a>
      <a class="button button--ghost" data-view-showtimes href="#">View Showtimes</a>
    </div>
    <button type="button" class="surprise-reveal__again" data-again hidden>↻ Surprise me again</button>
  `;

  return {
    root,
    label: root.querySelector(".surprise-reveal__label"),
    img: root.querySelector(".surprise-reveal__img"),
    title: root.querySelector(".surprise-reveal__title"),
    actions: root.querySelector(".surprise-reveal__actions"),
    again: root.querySelector("[data-again]"),
    viewMovie: root.querySelector("[data-view-movie]"),
    viewShowtimes: root.querySelector("[data-view-showtimes]"),
  };
}
