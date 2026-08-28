// js/modules/person.js · pages/person.html?id=<personId>
// Ficha de una persona: foto, datos, biografía y sus PELÍCULAS (TMDB).

import "../components/site-header.js";
import "../components/site-footer.js";

import {
  getPersonDetails,
  getPersonMovieCredits,
  imageUrl,
} from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setError } from "../ui/states.js";
import { createMovieCard } from "../ui/render.js";
import { formatReleaseDate, POSTER_PLACEHOLDER } from "../utils/helpers.js";

const DEPARTMENTS = {
  Acting: "Interpretación",
  Directing: "Dirección",
  Production: "Producción",
  Writing: "Guion",
  Sound: "Sonido",
  Camera: "Fotografía",
};

const personId = new URLSearchParams(location.search).get("id");

async function init() {
  const main = $("#main");

  if (!personId) {
    setError(main, "No se indicó ninguna persona.");
    return;
  }

  try {
    const [person, credits] = await Promise.all([
      getPersonDetails(personId),
      getPersonMovieCredits(personId).catch(() => ({ cast: [] })),
    ]);

    document.title = `${person.name} · CINEHUB`;
    render(main, person, credits);
  } catch {
    setError(main, "No se pudo cargar la información.", init);
  }
}

function render(main, person, credits) {
  const bio = (person.biography || "").trim();
  const shortBio = bio.length > 700 ? `${bio.slice(0, 700).trimEnd()}…` : bio;

  main.dataset.state = "ready";
  main.innerHTML = `
    <div class="container">
      <header class="person-hero">
        <img class="person-hero__photo"
             src="${imageUrl(person.profile_path, "w342") || POSTER_PLACEHOLDER}"
             alt="Foto de ${person.name}" />

        <div class="person-hero__info">
          <h1 class="person-hero__name">${person.name}</h1>

          <dl class="person-hero__facts">
            ${person.known_for_department ? `<div><dt>Conocido/a por</dt><dd>${
              DEPARTMENTS[person.known_for_department] ?? person.known_for_department
            }</dd></div>` : ""}
            ${person.birthday ? `<div><dt>Nacimiento</dt><dd>${formatReleaseDate(person.birthday)}${
              person.deathday ? " – " + formatReleaseDate(person.deathday) : ""
            }</dd></div>` : ""}
            ${person.place_of_birth ? `<div><dt>Lugar</dt><dd>${person.place_of_birth}</dd></div>` : ""}
          </dl>

          ${shortBio ? `<p class="person-hero__bio">${shortBio}</p>` : ""}
        </div>
      </header>

      <section class="section person-films" aria-labelledby="films-title">
        <div class="section__head">
          <h2 class="section__title" id="films-title">Películas</h2>
        </div>
        <div class="movie-grid" id="films-grid"></div>
      </section>
    </div>
  `;

  renderFilms(main.querySelector("#films-grid"), credits.cast ?? []);
}

function renderFilms(grid, cast) {
  // Quitar duplicados (a veces la persona aparece varias veces por película),
  // solo con póster, y ordenar por popularidad.
  const movies = [...new Map(cast.filter((m) => m.poster_path).map((m) => [m.id, m])).values()]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  if (movies.length === 0) {
    grid.innerHTML = `<p class="state">No hay películas para mostrar.</p>`;
    return;
  }

  grid.replaceChildren(...movies.slice(0, 24).map((movie) => createMovieCard(movie)));
}

init();
