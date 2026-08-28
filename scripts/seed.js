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

import { TMDB_TOKEN, TMDB_BASE_URL } from "../js/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "db.json");

const MOVIE_COUNT = 14; // películas de la cartelera de CINEHUB

/* -------------------------------------------------------------------------- */
/*  1. CONFIGURACIÓN                                                          */
/* -------------------------------------------------------------------------- */

// Salas del cine. rows = nº de filas (A, B, C...), seatsPerRow = butacas por fila.
const ROOMS = [
  { id: "room-1", name: "Room 1", rows: 6, seatsPerRow: 8, type: "standard" },
  { id: "room-2", name: "Room 2", rows: 6, seatsPerRow: 8, type: "standard" },
  { id: "room-3", name: "Room 3 · IMAX", rows: 5, seatsPerRow: 8, type: "imax" },
];

// Películas de reserva (fallback si TMDB no responde). El seed intenta primero
// traer las de "now playing" + "popular" de TMDB en vivo (ver getMovies()).
const FALLBACK_MOVIES = [
  { tmdbId: 693134, title: "Dune: Part Two" },
  { tmdbId: 558449, title: "Gladiator II" },
  { tmdbId: 533535, title: "Deadpool & Wolverine" },
  { tmdbId: 1022789, title: "Inside Out 2" },
  { tmdbId: 1184918, title: "The Wild Robot" },
  { tmdbId: 157336, title: "Interstellar" },
];

/** Trae películas reales de TMDB para la cartelera. */
async function getMovies() {
  if (!TMDB_TOKEN) return FALLBACK_MOVIES;

  try {
    const headers = { Authorization: `Bearer ${TMDB_TOKEN}`, accept: "application/json" };
    const endpoints = ["/movie/now_playing", "/movie/popular"];
    const lists = await Promise.all(
      endpoints.map((path) =>
        fetch(`${TMDB_BASE_URL}${path}?language=es-ES&page=1`, { headers }).then((r) => r.json())
      )
    );

    const byId = new Map();
    for (const list of lists) {
      for (const m of list.results ?? []) {
        if (m.poster_path && !byId.has(m.id)) {
          byId.set(m.id, { tmdbId: m.id, title: m.title });
        }
      }
    }

    const movies = [...byId.values()].slice(0, MOVIE_COUNT);
    return movies.length >= 6 ? movies : FALLBACK_MOVIES;
  } catch {
    console.warn("  (TMDB no respondió, uso películas de reserva)");
    return FALLBACK_MOVIES;
  }
}

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
// Se van rotando las películas para repartirlas por días/horas/salas.
function buildFunctions(days, movies) {
  const functions = [];
  let counter = 1;
  let movieIndex = 0;

  for (const date of days) {
    for (const time of SHOW_TIMES) {
      for (const room of ROOMS) {
        const movie = movies[movieIndex % movies.length];
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
/*  RESERVAS DE EJEMPLO                                                      */
/*  Solo para que "Popular at CINEHUB" tenga datos al arrancar. Sin compras: */
/*  "Mis tickets" empieza vacío. Todas son del usuario user-1 (vale).        */
/* -------------------------------------------------------------------------- */

// movieIndex apunta a la película (movies[i]); seatCount = nº de butacas.
const SEED_BOOKINGS = [
  { movieIndex: 0, seatCount: 3, paid: false },
  { movieIndex: 0, seatCount: 2, paid: false },
  { movieIndex: 1, seatCount: 4, paid: false },
  { movieIndex: 2, seatCount: 2, paid: false },
  { movieIndex: 3, seatCount: 3, paid: false },
];

function buildSeedBookings(functions, seats, movies) {
  const seatsByRoom = {};
  for (const s of seats) (seatsByRoom[s.roomId] ||= []).push(s);

  const roomName = (id) => ROOMS.find((r) => r.id === id).name;
  const usedByFunction = {}; // functionId -> Set(seatId) ya reservados

  const reservations = [];
  const purchases = [];
  let rc = 1;
  let pc = 1;

  for (const plan of SEED_BOOKINGS) {
    const movie = movies[plan.movieIndex % movies.length];
    const fn = functions.find(
      (f) => f.tmdbId === movie.tmdbId && (usedByFunction[f.id]?.size ?? 0) === 0
    );
    if (!fn) continue;

    const used = (usedByFunction[fn.id] ||= new Set());
    const picked = seatsByRoom[fn.roomId]
      .filter((s) => !used.has(s.id))
      .slice(0, plan.seatCount);
    picked.forEach((s) => used.add(s.id));

    const total = fn.price * picked.length;
    const createdAt = new Date(Date.now() - rc * 3_600_000).toISOString();

    const reservation = {
      id: `res-seed-${rc}`,
      userId: "user-1",
      tmdbId: fn.tmdbId,
      movieTitle: fn.movieTitle,
      functionId: fn.id,
      roomId: fn.roomId,
      roomName: roomName(fn.roomId),
      date: fn.date,
      time: fn.time,
      format: fn.format,
      seatIds: picked.map((s) => s.id),
      seatCodes: picked.map((s) => s.seatCode).sort(),
      quantity: picked.length,
      pricePerTicket: fn.price,
      total,
      status: "reserved",
      createdAt,
    };
    reservations.push(reservation);

    if (plan.paid) {
      purchases.push({
        id: `pur-seed-${pc}`,
        ticketId: `CH-2026-${String(100000 + pc * 12345).slice(0, 6)}`,
        userId: "user-1",
        reservationId: reservation.id,
        tmdbId: reservation.tmdbId,
        movieTitle: reservation.movieTitle,
        functionId: reservation.functionId,
        roomId: reservation.roomId,
        roomName: reservation.roomName,
        date: reservation.date,
        time: reservation.time,
        format: reservation.format,
        seatIds: reservation.seatIds,
        seatCodes: reservation.seatCodes,
        quantity: reservation.quantity,
        total: reservation.total,
        purchasedAt: createdAt,
      });
      pc += 1;
    }
    rc += 1;
  }

  return { reservations, purchases };
}

/**
 * Deja `functionSeats` coherente con las reservas/compras de ejemplo:
 *   butaca en una compra   -> "sold"
 *   butaca en una reserva  -> "reserved"
 * (Solo en la generación del seed; en runtime la app deriva el estado.)
 */
function applyBookingStatus(functionSeats, reservations, purchases) {
  const wanted = new Map(); // "functionId|seatId" -> status
  for (const r of reservations) {
    for (const seatId of r.seatIds) wanted.set(`${r.functionId}|${seatId}`, "reserved");
  }
  for (const p of purchases) {
    for (const seatId of p.seatIds) wanted.set(`${p.functionId}|${seatId}`, "sold");
  }

  for (const fs of functionSeats) {
    const status = wanted.get(`${fs.functionId}|${fs.seatId}`);
    if (status) fs.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/*  5. CONSTRUIR Y ESCRIBIR db.json                                          */
/* -------------------------------------------------------------------------- */

async function seed() {
  const days = buildDays();
  const movies = await getMovies();

  const rooms = ROOMS.map((r) => ({
    id: r.id,
    name: r.name,
    rows: r.rows,
    seatsPerRow: r.seatsPerRow,
    capacity: r.rows * r.seatsPerRow,
    type: r.type,
  }));

  const seats = buildSeats();
  const functions = buildFunctions(days, movies);
  const functionSeats = buildFunctionSeats(functions, seats);
  const { reservations, purchases } = buildSeedBookings(functions, seats, movies);
  applyBookingStatus(functionSeats, reservations, purchases);

  const db = {
    users: USERS,
    rooms,
    seats,
    functions,
    functionSeats,
    reservations,
    purchases,
    ratings: [],
  };

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + "\n", "utf-8");

  console.log("db.json generado:");
  console.log(`  users          : ${db.users.length}`);
  console.log(`  rooms          : ${db.rooms.length}`);
  console.log(`  seats          : ${db.seats.length}`);
  console.log(`  movies (TMDB)  : ${movies.length}`);
  console.log(`  functions      : ${db.functions.length}  (${days[0]} -> ${days[days.length - 1]})`);
  console.log(`  functionSeats  : ${db.functionSeats.length}`);
  console.log(`  reservations   : ${db.reservations.length}  (ejemplo)`);
  console.log(`  purchases      : ${db.purchases.length}  (ejemplo)`);
}

seed();
