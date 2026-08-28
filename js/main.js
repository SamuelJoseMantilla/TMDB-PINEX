// js/main.js
// Orquestador de la Homepage: registra Web Components, obtiene la tabla de
// géneros (compartida) y arranca cada sección de forma independiente.
// Si una sección falla, las demás siguen funcionando (cada init maneja su error).

import "./components/site-header.js";
import "./components/site-footer.js";
import "./components/app-modal.js";

import { getGenres } from "./services/tmdb.service.js";
import { initHero } from "./modules/hero.js";
import { initNowShowing, initTrending, initComingSoon } from "./modules/movies.js";
import { initTrailers } from "./modules/trailers.js";
import { initSurprise } from "./modules/surprise.js";
import { initQuickBooking } from "./modules/quick-booking.js";
import { initPopular } from "./modules/popular.js";
import { animateHero, animateSectionOnScroll } from "./modules/animations.js";

console.log("CINEHUB · Homepage");

initQuickBooking(); // solo depende de JSON Server
initPopular(); // datos propios (reservations) + TMDB solo para el póster

async function bootHome() {
  // La lista de géneros traduce los genre_ids de las películas a nombres.
  // Es decorativa: si falla, seguimos sin nombres de género.
  let genreMap = new Map();
  try {
    const genres = await getGenres();
    genreMap = new Map(genres.map((g) => [g.id, g.name]));
  } catch {
    console.warn("No se pudo cargar la lista de géneros de TMDB.");
  }

  initHero().finally(animateHero);
  initTrailers();
  initSurprise();

  // Secciones con aparición escalonada al hacer scroll: animar cuando ya
  // tienen las tarjetas dentro.
  await Promise.allSettled([
    initNowShowing(genreMap),
    initTrending(genreMap),
    initComingSoon(genreMap),
  ]);
  animateSectionOnScroll("#now-showing");
  animateSectionOnScroll("#trending");
  animateSectionOnScroll("#coming-soon");
}

bootHome();
