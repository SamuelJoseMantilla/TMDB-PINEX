// scripts/check-tmdb.js
// Verifica que:
//   1. El token de TMDB en js/config.js es válido.
//   2. Las 6 películas usadas en el seed (scripts/seed.js) existen en TMDB.
//
// Ejecutar con:  npm run check:tmdb

import { TMDB_TOKEN, TMDB_BASE_URL } from "../js/config.js";

// Mismos IDs que MOVIES en scripts/seed.js
const SEED_MOVIES = [
  { tmdbId: 693134, title: "Dune: Part Two" },
  { tmdbId: 558449, title: "Gladiator II" },
  { tmdbId: 533535, title: "Deadpool & Wolverine" },
  { tmdbId: 1022789, title: "Inside Out 2" },
  { tmdbId: 1184918, title: "The Wild Robot" },
  { tmdbId: 157336, title: "Interstellar" },
];

if (!TMDB_TOKEN) {
  console.error("\n  Falta el token. Pega tu API Read Access Token (v4) en js/config.js\n");
  process.exit(1);
}

console.log("\nComprobando token y películas del seed...\n");

let allOk = true;

for (const movie of SEED_MOVIES) {
  const res = await fetch(`${TMDB_BASE_URL}/movie/${movie.tmdbId}?language=es-ES`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: "application/json" },
  });

  if (res.status === 401) {
    console.error("  Token INVÁLIDO (401). Revisa js/config.js.\n");
    process.exit(1);
  }

  if (res.ok) {
    const data = await res.json();
    console.log(`  OK    ${String(movie.tmdbId).padEnd(8)} ${data.title}  ·  estreno ${data.release_date || "?"}`);
  } else {
    allOk = false;
    console.log(`  FALLA ${String(movie.tmdbId).padEnd(8)} ${movie.title}  (HTTP ${res.status})`);
  }
}

console.log(
  allOk
    ? "\nTodo correcto. El token funciona y las 6 películas existen.\n"
    : "\nAlguna película no resolvió. Avísame y cambiamos ese ID en seed.js.\n"
);
