// js/modules/reservations.js
// Crear, consultar y cancelar reservas.
//
// La disponibilidad de butacas se DERIVA de reservations + purchases (ver
// seats.js), así que crear/cancelar una reserva es UNA sola escritura.

import { getAll, getById, create, update } from "../services/api.service.js";
import { getCurrentUser } from "./auth.js";
import { checkSeatsAvailable } from "./seats.js";

export const RESERVATION_STATUS = {
  RESERVED: "reserved",
  PAID: "paid",
  CANCELLED: "cancelled",
};

/**
 * Crea una reserva para la función y butacas seleccionadas.
 * @param {{ ctx: {fn, room}, selectedSeats: Array }} args
 * @returns {Promise<object>} la reserva creada
 */
export async function createReservation({ ctx, selectedSeats }) {
  const user = getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");
  if (selectedSeats.length === 0) throw new Error("Selecciona al menos una butaca.");

  const { fn, room } = ctx;
  const seatIds = selectedSeats.map((s) => s.seatId);

  // RF-15 · re-consultar disponibilidad justo antes de escribir
  const check = await checkSeatsAvailable(fn.id, seatIds);
  if (!check.ok) {
    const codes = selectedSeats
      .filter((s) => check.unavailable.includes(s.seatId))
      .map((s) => s.seatCode);
    throw new Error(`Estas butacas ya no están libres: ${codes.join(", ")}.`);
  }

  // UNA escritura
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
    quantity: selectedSeats.length,
    pricePerTicket: fn.price,
    total: fn.price * selectedSeats.length,
    status: RESERVATION_STATUS.RESERVED,
    createdAt: new Date().toISOString(),
  };

  return create("reservations", reservation);
}

/** Reservas de un usuario, de la más reciente a la más antigua. */
export async function getUserReservations(userId) {
  const list = await getAll("reservations", { userId });
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Cancela una reserva sin pagar. UNA escritura: la reserva pasa a "cancelled" y
 * sus butacas quedan libres automáticamente (ya no cuentan como "reserved").
 * @param {string} reservationId
 * @returns {Promise<object>}
 */
export async function cancelReservation(reservationId) {
  const reservation = await getById("reservations", reservationId);

  if (reservation.status === RESERVATION_STATUS.CANCELLED) {
    throw new Error("Esta reserva ya está cancelada.");
  }

  // "pagada" = existe una compra para ella (estado derivado)
  const purchases = await getAll("purchases", { reservationId });
  if (purchases.length > 0) {
    throw new Error("No se puede cancelar una reserva ya pagada.");
  }

  return update("reservations", reservationId, {
    status: RESERVATION_STATUS.CANCELLED,
  });
}
