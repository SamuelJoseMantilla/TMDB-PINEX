// js/services/tmdb.service.js
// ÚNICO módulo que habla con la API de TMDB. El resto del código pide películas
// a través de estas funciones, nunca hace fetch a themoviedb.org directamente.
//
// Autenticación: token v4 en la cabecera Authorization (ver js/config.js).

import {
  TMDB_TOKEN,
  TMDB_BASE_URL,
  TMDB_IMAGE_URL,
  TMDB_LANG,
} from "../config.js";

/**
 * Envoltorio central sobre fetch para TMDB.
 * @param {string} path   ruta que empieza por "/", p.ej. "/movie/now_playing"
 * @param {object} params parámetros extra de query (?key=value)
 * @returns {Promise<any>}
 */
async function tmdbRequest(path, params = {}) {
  if (!TMDB_TOKEN) {
    throw new Error(
      "Falta el token de TMDB. Pégalo en js/config.js (constante TMDB_TOKEN)."
    );
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("language", TMDB_LANG);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_TOKEN}`,
        accept: "application/json",
      },
    });
  } catch (networkError) {
    throw new Error("No se pudo conectar con TMDB. ¿Tienes conexión a internet?");
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Token de TMDB inválido (401). Revisa js/config.js.");
    }
    throw new Error(`TMDB respondió ${response.status} en ${path}`);
  }

  return response.json();
}

/* ---------------------------- LISTAS DE PELÍCULAS ------------------------- */

// Devuelven directamente el array `results` (lo que casi siempre queremos pintar).

export async function getNowPlaying(page = 1) {
  const data = await tmdbRequest("/movie/now_playing", { page });
  return data.results;
}

export async function getTrending(page = 1) {
  const data = await tmdbRequest("/trending/movie/week", { page });
  return data.results;
}

export async function getUpcoming(page = 1) {
  const data = await tmdbRequest("/movie/upcoming", { page });
  return data.results;
}

export async function searchMovies(query, page = 1) {
  const q = query.trim();
  if (!q) return []; // búsqueda vacía: no llamamos a la API
  const data = await tmdbRequest("/search/movie", { query: q, page, include_adult: false });
  return data.results;
}

export async function getMoviesByGenre(genreId, page = 1) {
  const data = await tmdbRequest("/discover/movie", {
    with_genres: genreId,
    page,
    sort_by: "popularity.desc",
    include_adult: false,
  });
  return data.results;
}

/* ---------------------------- DETALLE DE PELÍCULA ------------------------- */

// Devuelven el objeto completo tal cual lo da TMDB.

export function getMovieDetails(movieId) {
  return tmdbRequest(`/movie/${movieId}`);
}

export function getMovieCredits(movieId) {
  return tmdbRequest(`/movie/${movieId}/credits`);
}

/**
 * Trailers y clips. Pedimos primero en el idioma configurado; si TMDB no tiene
 * vídeos en ese idioma (habitual), reintentamos en inglés.
 * Devuelve el array `results`.
 */
export async function getMovieVideos(movieId) {
  const localized = await tmdbRequest(`/movie/${movieId}/videos`);
  if (localized.results && localized.results.length > 0) return localized.results;

  const fallback = await tmdbRequest(`/movie/${movieId}/videos`, { language: "en-US" });
  return fallback.results ?? [];
}

/* ------------------------------- GÉNEROS --------------------------------- */

export async function getGenres() {
  const data = await tmdbRequest("/genre/movie/list");
  return data.genres; // [{ id: 28, name: "Acción" }, ...]
}

/* ------------------------------- IMÁGENES -------------------------------- */

/**
 * Construye la URL de una imagen de TMDB a partir de su ruta.
 * @param {string|null} path  p.ej. "/abc123.jpg" (viene en poster_path / backdrop_path)
 * @param {string} size       w185 | w342 | w500 | w780 | w1280 | original
 * @returns {string}          URL completa, o "" si no hay imagen (usa un placeholder)
 */
export function imageUrl(path, size = "w500") {
  if (!path) return "";
  return `${TMDB_IMAGE_URL}/${size}${path}`;
}
