// js/config.example.js
// PLANTILLA. Copia este archivo como  js/config.js  y pon tu token de TMDB.
//   Windows PowerShell:  Copy-Item js/config.example.js js/config.js
//   Git Bash / Linux:    cp js/config.example.js js/config.js
//
// js/config.js está en .gitignore: nunca se sube al repositorio.

/* ---- JSON Server (backend simulado de CINEHUB) ---- */
export const API_BASE_URL = "http://localhost:3000";

/* ---- TMDB (información de películas) ---- */
// Pega tu "API Read Access Token (v4)" entre las comillas.
// Se obtiene en https://www.themoviedb.org/settings/api
export const TMDB_TOKEN = "";
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p"; // + /w500/archivo.jpg
export const TMDB_LANG = "es-ES";

/* ---- Ajustes de la aplicación ---- */
// Película destacada del Hero de la Homepage (Gladiator II).
// Si TMDB falla al pedirla, la Home usará la primera de "Now Playing".
export const FEATURED_MOVIE_ID = 558449;

// Precio por defecto si una función no lo trae (no debería pasar).
export const DEFAULT_TICKET_PRICE = 18000;
