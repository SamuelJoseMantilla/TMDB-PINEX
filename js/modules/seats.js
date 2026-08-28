// js/modules/seats.js
// Capa de acceso a los datos de sillas por función. La usan las Fases 15-20.
//
// Idea central (functionSeats): el estado de una silla depende de la FUNCIÓN.
// La misma butaca C5 puede estar "sold" en la función de las 15:00 y "available"
// en la de las 21:30 -> son registros distintos en functionSeats.

import { getById, getAll, update } from "../services/api.service.js";

export const SEAT_STATUS = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
};

/**
 * Reúne todo lo necesario para dibujar el mapa de sillas de una función.
 * @param {string} functionId
 * @returns {Promise<{ fn: object, room: object, rows: RowGroup[] }>}
 *   RowGroup = { row: "A", seats: SeatCell[] }
 *   SeatCell = { seatId, seatCode, row, number, location, status,
 *                functionSeatId, recommended }
 */
export async function getFunctionContext(functionId) {
  const fn = await getById("functions", functionId);

  // _expand=seat -> json-server adjunta el objeto seat a cada functionSeat,
  // así una sola petición trae estado + fila/número/ubicación.
  const [room, functionSeats] = await Promise.all([
    getById("rooms", fn.roomId),
    getAll("functionSeats", { functionId, _expand: "seat" }),
  ]);

  return { fn, room, rows: groupByRow(functionSeats) };
}

function groupByRow(functionSeats) {
  const byRow = new Map();

  for (const fs of functionSeats) {
    const seat = fs.seat;
    if (!seat) continue;

    const cell = {
      seatId: seat.id,
      seatCode: seat.seatCode,
      row: seat.row,
      number: seat.number,
      location: seat.location,
      status: fs.status,
      functionSeatId: fs.id,
      recommended: seat.location === "center", // "BEST VIEW"
    };

    if (!byRow.has(seat.row)) byRow.set(seat.row, []);
    byRow.get(seat.row).push(cell);
  }

  return [...byRow.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([row, seats]) => ({
      row,
      seats: seats.sort((a, b) => a.number - b.number),
    }));
}

/**
 * Re-consulta la disponibilidad de unas sillas concretas justo antes de
 * confirmar una reserva o compra (RF-15: previene la doble reserva).
 * @param {string} functionId
 * @param {string[]} seatIds
 * @returns {Promise<{ ok: boolean, unavailable: string[], functionSeatIds: string[] }>}
 */
export async function checkSeatsAvailable(functionId, seatIds) {
  const functionSeats = await getAll("functionSeats", { functionId, _expand: "seat" });
  const bySeatId = new Map(functionSeats.map((fs) => [fs.seatId, fs]));

  const unavailable = [];
  const functionSeatIds = [];

  for (const seatId of seatIds) {
    const fs = bySeatId.get(seatId);
    if (!fs || fs.status !== SEAT_STATUS.AVAILABLE) {
      unavailable.push(fs?.seat?.seatCode ?? seatId);
    } else {
      functionSeatIds.push(fs.id);
    }
  }

  return { ok: unavailable.length === 0, unavailable, functionSeatIds };
}

/** Cambia el estado de una silla en una función. */
export function setSeatStatus(functionSeatId, status) {
  return update("functionSeats", functionSeatId, { status });
}

/** Cambia el estado de varias sillas a la vez. */
export function setSeatsStatus(functionSeatIds, status) {
  return Promise.all(functionSeatIds.map((id) => setSeatStatus(id, status)));
}
