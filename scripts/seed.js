// scripts/seed.js
// Genera db.json con datos iniciales de CINEHUB.
// Ejecutar con:  npm run seed
//
// Genera en cascada:  rooms -> seats -> functions -> functionSeats
// Las colecciones reservations / purchases / ratings se dejan vacías: se llenan
// usando la aplicación.
//
// IMPORTANTE: volver a ejecutar este script SOBRESCRIBE db.json por completo,
// incluidas las reservas de prueba que hayas creado.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "db.json");

/* -------------------------------------------------------------------------- */
/*  1. CONFIGURACIÓN                                                          */
/* -------------------------------------------------------------------------- */

// Salas del cine. rows = nº de filas (A, B, C...), seatsPerRow = butacas por fila.
const ROOMS = [
  { id: "room-1", name: "Room 1", rows: 6, seatsPerRow: 8, type: "standard" },
  { id: "room-2", name: "Room 2", rows: 6, seatsPerRow: 8, type: "standard" },
  { id: "room-3", name: "Room 3 · IMAX", rows: 5, seatsPerRow: 8, type: "imax" },
];

// Películas en cartelera. Son IDs REALES de TMDB.
// En la Fase 6 (conexión con TMDB) verificamos que todos resuelven y cambiamos
// el que falle. El resto de la info (poster, sinopsis, reparto...) se pide a
// TMDB en vivo; aquí solo guardamos el vínculo (tmdbId) + el título como copia.
const MOVIES = [
  { tmdbId: 693134, title: "Dune: Part Two" },
  { tmdbId: 558449, title: "Gladiator II" },
  { tmdbId: 533535, title: "Deadpool & Wolverine" },
  { tmdbId: 1022789, title: "Inside Out 2" },
  { tmdbId: 1184918, title: "The Wild Robot" },
  { tmdbId: 157336, title: "Interstellar" },
];

// Horarios de cada día y precios por tipo de sala.
const SHOW_TIMES = ["15:00", "18:30", "21:30"];
const PRICE = { standard: 18000, imax: 25000 };
const FORMAT = { standard: "2D", imax: "IMAX" };
const DAYS_AHEAD = 7; // hoy + 6 días

/* -------------------------------------------------------------------------- */
/*  2. HELPERS                                                                */
/* -------------------------------------------------------------------------- */

// Fecha local en formato YYYY-MM-DD (no uso toISOString para evitar el desfase
// de zona horaria cerca de medianoche).
function localDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Letra de fila a partir de un índice: 0 -> "A", 1 -> "B", ...
function rowLetter(index) {
  return String.fromCharCode(65 + index);
}

// Ubicación aproximada dentro de la sala según la fila.
// Filas A-B = front, C-D = center, E en adelante = back.
function seatLocation(rowIndex) {
  if (rowIndex <= 1) return "front";
  if (rowIndex <= 3) return "center";
  return "back";
}

// Lista de fechas: [hoy, hoy+1, ..., hoy+(DAYS_AHEAD-1)]
function buildDays() {
  const days = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(localDate(d));
  }
  return days;
}

/* -------------------------------------------------------------------------- */
/*  3. GENERADORES                                                            */
/* -------------------------------------------------------------------------- */

// SEATS: por cada sala, todas sus butacas (filas × columnas).
function buildSeats() {
  const seats = [];
  for (const room of ROOMS) {
    for (let r = 0; r < room.rows; r++) {
      const letter = rowLetter(r);
      for (let n = 1; n <= room.seatsPerRow; n++) {
        const seatCode = `${letter}${n}`;
        seats.push({
          id: `seat-${room.id}-${seatCode}`,
          roomId: room.id,
          seatCode,
          row: letter,
          number: n,
          location: seatLocation(r),
        });
      }
    }
  }
  return seats;
}

// FUNCTIONS: por cada día × horario × sala se programa UNA película.
// Se van rotando las películas de MOVIES para repartirlas por días/horas/salas.
function buildFunctions(days) {
  const functions = [];
  let counter = 1;
  let movieIndex = 0;

  for (const date of days) {
    for (const time of SHOW_TIMES) {
      for (const room of ROOMS) {
        const movie = MOVIES[movieIndex % MOVIES.length];
        movieIndex++;

        functions.push({
          id: `func-${counter}`,
          tmdbId: movie.tmdbId,
          movieTitle: movie.title,
          roomId: room.id,
          date,
          time,
          price: PRICE[room.type],
          format: FORMAT[room.type],
          language: "Subtitulada",
        });
        counter++;
      }
    }
  }
  return functions;
}

// FUNCTION_SEATS: por cada función, una fila por cada butaca de su sala.
// Todas empiezan "available". Aquí es donde vive el estado real de disponibilidad.
function buildFunctionSeats(functions, seats) {
  const seatsByRoom = {};
  for (const seat of seats) {
    (seatsByRoom[seat.roomId] ||= []).push(seat);
  }

  const functionSeats = [];
  let counter = 1;

  for (const fn of functions) {
    for (const seat of seatsByRoom[fn.roomId]) {
      functionSeats.push({
        id: `fs-${counter}`,
        functionId: fn.id,
        seatId: seat.id,
        status: "available",
      });
      counter++;
    }
  }
  return functionSeats;
}

/* -------------------------------------------------------------------------- */
/*  4. USUARIOS DE PRUEBA                                                     */
/* -------------------------------------------------------------------------- */

// Contraseñas en texto plano: es un proyecto académico con JSON Server, no hay
// hashing ni autenticación real. Nunca se guardan en localStorage (Fase 13).
const USERS = [
  { id: "user-1", name: "Valentina Pallares", email: "vale@cinehub.com", password: "cinehub123" },
  { id: "user-2", name: "Demo User", email: "demo@cinehub.com", password: "demo1234" },
];

/* -------------------------------------------------------------------------- */
/*  5. CONSTRUIR Y ESCRIBIR db.json                                          */
/* -------------------------------------------------------------------------- */

function seed() {
  const days = buildDays();

  const rooms = ROOMS.map((r) => ({
    id: r.id,
    name: r.name,
    rows: r.rows,
    seatsPerRow: r.seatsPerRow,
    capacity: r.rows * r.seatsPerRow,
    type: r.type,
  }));

  const seats = buildSeats();
  const functions = buildFunctions(days);
  const functionSeats = buildFunctionSeats(functions, seats);

  const db = {
    users: USERS,
    rooms,
    seats,
    functions,
    functionSeats,
    reservations: [],
    purchases: [],
    ratings: [],
  };

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + "\n", "utf-8");

  console.log("db.json generado:");
  console.log(`  users          : ${db.users.length}`);
  console.log(`  rooms          : ${db.rooms.length}`);
  console.log(`  seats          : ${db.seats.length}`);
  console.log(`  functions      : ${db.functions.length}  (${days[0]} -> ${days[days.length - 1]})`);
  console.log(`  functionSeats  : ${db.functionSeats.length}`);
  console.log(`  reservations   : ${db.reservations.length}`);
  console.log(`  purchases      : ${db.purchases.length}`);
  console.log(`  ratings        : ${db.ratings.length}`);
}

seed();
