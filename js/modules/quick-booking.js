// js/modules/quick-booking.js
// "Quick Booking" de la Homepage: elige película + fecha + hora (+ sala) y busca
// funciones reales en JSON Server.
//
// Datos: colección `functions` (cada función tiene tmdbId, movieTitle, roomId,
// date, time, price) y colección `rooms`.

import { getAll } from "../services/api.service.js";
import { $ } from "../utils/dom.js";
import { dateOptionLabel, formatMoney } from "../utils/helpers.js";

// Estado del módulo: se carga una vez al arrancar.
let allFunctions = [];
let allRooms = [];

export async function initQuickBooking() {
  const form = $("#quick-booking-form");
  const feedback = $("#quick-booking-feedback");
  if (!form) return;

  const movieSel = $("#qb-movie");
  const dateSel = $("#qb-date");
  const timeSel = $("#qb-time");
  const roomSel = $("#qb-room");
  const submitBtn = form.querySelector('button[type="submit"]');

  try {
    [allFunctions, allRooms] = await Promise.all([getAll("functions"), getAll("rooms")]);
  } catch {
    setFeedback(feedback, "No se pudo cargar la cartelera del cine. ¿Está corriendo la API?", "error");
    submitBtn.disabled = true;
    return;
  }

  // Rellenar los selects con todas las opciones posibles.
  setOptions(movieSel, uniqueMovies());
  setOptions(dateSel, dateOptions(allFunctions));
  setOptions(timeSel, timeOptions(allFunctions));
  setOptions(roomSel, allRooms.map((room) => ({ value: room.id, label: room.name })));

  // Cascada: película -> fechas válidas -> horas válidas.
  movieSel.addEventListener("change", () => {
    const forMovie = matchFunctions({ tmdbId: movieSel.value });
    setOptions(dateSel, dateOptions(forMovie), dateSel.value);
    setOptions(
      timeSel,
      timeOptions(matchFunctions({ tmdbId: movieSel.value, date: dateSel.value })),
      timeSel.value
    );
  });

  dateSel.addEventListener("change", () => {
    setOptions(
      timeSel,
      timeOptions(matchFunctions({ tmdbId: movieSel.value, date: dateSel.value })),
      timeSel.value
    );
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const matches = matchFunctions({
      tmdbId: movieSel.value,
      date: dateSel.value,
      time: timeSel.value,
      roomId: roomSel.value || null,
    });

    if (matches.length === 0) {
      setFeedback(feedback, "No hay funciones para esa combinación. Prueba otra fecha u hora.", "error");
      return;
    }
    renderMatches(feedback, matches);
  });
}

/* ---------------------------- filtrado -------------------------------- */

function matchFunctions({ tmdbId, date, time, roomId } = {}) {
  return allFunctions.filter(
    (fn) =>
      (!tmdbId || String(fn.tmdbId) === String(tmdbId)) &&
      (!date || fn.date === date) &&
      (!time || fn.time === time) &&
      (!roomId || fn.roomId === roomId)
  );
}

/* ------------------------- opciones de selects ----------------------- */

function uniqueMovies() {
  const seen = new Map(); // tmdbId -> title
  for (const fn of allFunctions) {
    if (!seen.has(fn.tmdbId)) seen.set(fn.tmdbId, fn.movieTitle);
  }
  return [...seen.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([id, title]) => ({ value: String(id), label: title }));
}

function dateOptions(functions) {
  return [...new Set(functions.map((fn) => fn.date))]
    .sort()
    .map((date) => ({ value: date, label: dateOptionLabel(date) }));
}

function timeOptions(functions) {
  return [...new Set(functions.map((fn) => fn.time))]
    .sort()
    .map((time) => ({ value: time, label: time }));
}

/**
 * Reconstruye un <select> conservando su primera <option> (el placeholder)
 * y, si sigue siendo válida, la opción que estaba seleccionada.
 */
function setOptions(select, items, keepValue) {
  const placeholder = select.querySelector('option[value=""]');
  select.replaceChildren(placeholder);

  for (const { value, label } of items) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  if (keepValue && items.some((item) => item.value === keepValue)) {
    select.value = keepValue;
  }
}

/* ---------------------------- resultados ----------------------------- */

function renderMatches(feedback, matches) {
  feedback.dataset.state = "";
  feedback.replaceChildren();

  const heading = document.createElement("p");
  heading.textContent =
    matches.length === 1 ? "1 función encontrada:" : `${matches.length} funciones encontradas:`;

  const list = document.createElement("ul");
  list.className = "qb-matches";

  for (const fn of matches) {
    const room = allRooms.find((r) => r.id === fn.roomId);
    const item = document.createElement("li");

    const link = document.createElement("a");
    link.className = "qb-match";
    link.href = `pages/booking.html?functionId=${fn.id}`;
    link.innerHTML = `
      <span class="qb-match__time">${fn.time}</span>
      <span class="qb-match__room">${room?.name ?? fn.roomId}</span>
      <span class="qb-match__price">${formatMoney(fn.price)}</span>
      <span class="qb-match__go">Reservar →</span>
    `;

    item.append(link);
    list.append(item);
  }

  feedback.append(heading, list);
}

function setFeedback(el, message, state = "") {
  el.dataset.state = state;
  el.textContent = message;
}
