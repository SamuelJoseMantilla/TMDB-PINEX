// js/main.js
// Orquestador de la Homepage: registra el Web Component del modal, obtiene la
// tabla de géneros (compartida) y arranca cada sección de forma independiente.
// Si una sección falla, las demás siguen funcionando (cada init maneja su error).

import "./components/app-modal.js";

import { getGenres } from "./services/tmdb.service.js";
import { initHeaderSearch } from "./modules/search.js";
import { initHero } from "./modules/hero.js";
import { initNowShowing, initTrending, initComingSoon } from "./modules/movies.js";
import { initTrailers } from "./modules/trailers.js";
import { initSurprise } from "./modules/surprise.js";
import { initQuickBooking } from "./modules/quick-booking.js";

console.log("CINEHUB · Homepage (Fase 9 · TMDB conectado)");

initHeaderSearch();
initQuickBooking(); // solo depende de JSON Server, va aparte de las secciones de TMDB

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

  initHero();
  initNowShowing(genreMap);
  initTrending(genreMap);
  initComingSoon(genreMap);
  initTrailers();
  initSurprise();
}

// initSurprise no necesita esperar a los géneros; podría ir fuera, pero lo
// dejamos en bootHome por orden. initQuickBooking sí va aparte (ver arriba).

bootHome();
