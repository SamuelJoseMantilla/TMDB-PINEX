// js/main.js
// Punto de entrada de la Homepage.
// Fase 6: comprueba la conexión con JSON Server Y con TMDB.
// Se reemplazará por la lógica real de la Home a partir de la Fase 7.

import { getAll } from "./services/api.service.js";
import { getMovieDetails } from "./services/tmdb.service.js";
import { FEATURED_MOVIE_ID } from "./config.js";

console.log("CINEHUB · frontend cargado");

const statusEl = document.getElementById("status");

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

async function checkJsonServer() {
  const [users, functionsToday] = await Promise.all([
    getAll("users"),
    getAll("functions", { date: todayISO() }),
  ]);
  return `JSON Server OK · ${users.length} usuarios · ${functionsToday.length} funciones hoy`;
}

async function checkTmdb() {
  const movie = await getMovieDetails(FEATURED_MOVIE_ID);
  return `TMDB OK · película destacada: ${movie.title}`;
}

async function bootCheck() {
  const lines = [];

  try {
    lines.push(await checkJsonServer());
  } catch (error) {
    lines.push(error.message);
  }

  try {
    lines.push(await checkTmdb());
  } catch (error) {
    lines.push(error.message);
  }

  statusEl.innerHTML = lines.join("<br>");
  statusEl.style.color = "var(--color-primary)";
}

bootCheck();
