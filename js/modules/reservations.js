// js/modules/reservations.js
// Crear y consultar reservas. La cancelación (liberar butacas) va en la Fase 19.

import { getAll, create, remove } from "../services/api.service.js";
import { getCurrentUser } from "./auth.js";
import { setSeatStatus, checkSeatsAvailable, SEAT_STATUS } from "./seats.js";

export const RESERVATION_STATUS = {
  RESERVED: "reserved",
  PAID: "paid",
  CANCELLED: "cancelled",
};

/**
 * Crea una reserva para la función y butacas seleccionadas.
 *
 * Orden: (1) re-chequear disponibilidad, (2) POST reserva, (3) PATCH butacas a
 * "reserved". Si un PATCH falla -> rollback (revertir butacas + borrar la reserva).
 *
 * @param {{ ctx: {fn, room}, selectedSeats: Array, functionSeatIds: string[] }} args
 * @returns {Promise<object>} la reserva creada
 */
export async function createReservation({ ctx, selectedSeats }) {
  const user = getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");
  if (selectedSeats.length === 0) throw new Error("Selecciona al menos una butaca.");

  const { fn, room } = ctx;
  const seatIds = selectedSeats.map((s) => s.seatId);

  // 1. RF-15 · re-consultar justo antes de escribir
  const check = await checkSeatsAvailable(fn.id, seatIds);
  if (!check.ok) {
    throw new Error(`Estas butacas ya no están libres: ${check.unavailable.join(", ")}.`);
  }
  const functionSeatIds = check.functionSeatIds;

  // 2. Crear la reserva PRIMERO
  const reservation = {
    id: `res-${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    tmdbId: fn.tmdbId,
    movieTitle: fn.movieTitle,
    functionId: fn.id,
    roomId: fn.roomId,
    roomName: room.name,
    date: fn.date,
    time: fn.time,
    format: fn.format,
    seatIds,
    seatCodes: selectedSeats.map((s) => s.seatCode).sort(),
    functionSeatIds,
    quantity: selectedSeats.length,
    pricePerTicket: fn.price,
    total: fn.price * selectedSeats.length,
    status: RESERVATION_STATUS.RESERVED,
    createdAt: new Date().toISOString(),
  };

  const created = await create("reservations", reservation);

  // 3. Bloquear butacas (secuencial, para poder revertir con precisión)
  const patched = [];
  try {
    for (const fsId of functionSeatIds) {
      await setSeatStatus(fsId, SEAT_STATUS.RESERVED);
      patched.push(fsId);
    }
  } catch {
    // rollback
    await Promise.allSettled(
      patched.map((id) => setSeatStatus(id, SEAT_STATUS.AVAILABLE))
    );
    await remove("reservations", created.id).catch(() => {});
    throw new Error("No se pudo completar la reserva. Inténtalo de nuevo.");
  }

  return created;
}

/** Reservas de un usuario, de la más reciente a la más antigua. */
export async function getUserReservations(userId) {
  const list = await getAll("reservations", { userId });
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
