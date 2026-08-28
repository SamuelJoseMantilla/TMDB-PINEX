// js/modules/seats.js
// Disponibilidad de butacas por función.
//
// FUENTE DE VERDAD: las colecciones `reservations` y `purchases`.
//   - butaca "sold"      -> está en algún purchase de esta función
//   - butaca "reserved"  -> está en alguna reservation con status "reserved"
//   - butaca "available" -> ninguna de las anteriores
//
// No se escribe el estado en `functionSeats` (json-server local pierde escrituras
// cuando van varias seguidas). Derivar el estado = 1 sola escritura por operación
// y cero inconsistencias.

import { getById, getAll } from "../services/api.service.js";

export const SEAT_STATUS = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
};

/**
 * Devuelve, para una función, qué butacas están ocupadas.
 * @returns {Promise<{ sold: Set<string>, reserved: Set<string> }>} (seatIds)
 */
export async function getTakenSeats(functionId) {
  const [reservations, purchases] = await Promise.all([
    getAll("reservations", { functionId }),
    getAll("purchases", { functionId }),
  ]);

  const sold = new Set(purchases.flatMap((p) => p.seatIds ?? []));
  const reserved = new Set(
    reservations
      .filter((r) => r.status === SEAT_STATUS.RESERVED)
      .flatMap((r) => r.seatIds ?? [])
  );
  // Si una butaca aparece como vendida y reservada, gana "vendida".
  for (const id of sold) reserved.delete(id);

  return { sold, reserved };
}

/**
 * Reúne todo lo necesario para dibujar el mapa de sillas de una función.
 * @returns {Promise<{ fn, room, rows: RowGroup[] }>}
 *   RowGroup = { row: "A", seats: SeatCell[] }
 *   SeatCell = { seatId, seatCode, row, number, location, status, recommended }
 */
export async function getFunctionContext(functionId) {
  const fn = await getById("functions", functionId);

  const [room, seats, taken] = await Promise.all([
    getById("rooms", fn.roomId),
    getAll("seats", { roomId: fn.roomId }),
    getTakenSeats(functionId),
  ]);

  const statusOf = (seatId) => {
    if (taken.sold.has(seatId)) return SEAT_STATUS.SOLD;
    if (taken.reserved.has(seatId)) return SEAT_STATUS.RESERVED;
    return SEAT_STATUS.AVAILABLE;
  };

  return { fn, room, rows: groupByRow(seats, statusOf) };
}

function groupByRow(seats, statusOf) {
  const byRow = new Map();

  for (const seat of seats) {
    const cell = {
      seatId: seat.id,
      seatCode: seat.seatCode,
      row: seat.row,
      number: seat.number,
      location: seat.location,
      status: statusOf(seat.id),
      recommended: seat.location === "center", // "BEST VIEW"
    };
    if (!byRow.has(seat.row)) byRow.set(seat.row, []);
    byRow.get(seat.row).push(cell);
  }

  return [...byRow.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([row, list]) => ({
      row,
      seats: list.sort((a, b) => a.number - b.number),
    }));
}

/**
 * Re-consulta la disponibilidad de unas butacas concretas justo antes de
 * confirmar una reserva o compra (RF-15: previene la doble reserva).
 * @returns {Promise<{ ok: boolean, unavailable: string[] }>} unavailable = seatIds
 */
export async function checkSeatsAvailable(functionId, seatIds) {
  const taken = await getTakenSeats(functionId);
  const unavailable = seatIds.filter(
    (id) => taken.sold.has(id) || taken.reserved.has(id)
  );
  return { ok: unavailable.length === 0, unavailable };
}
