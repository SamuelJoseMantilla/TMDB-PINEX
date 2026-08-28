// js/modules/purchases.js
// Convierte una reserva pagada en una compra.
//
// D4: la reserva NO se borra -> pasa a status "paid" y se crea un registro en
// `purchases` enlazado por reservationId. El ticket (Fase 22) se puede
// reconstruir desde cualquiera de los dos.

import { getAll, getById, create, update, remove } from "../services/api.service.js";
import { getCurrentUser } from "./auth.js";
import { setSeatStatus, SEAT_STATUS } from "./seats.js";
import { RESERVATION_STATUS } from "./reservations.js";

function makeTicketId() {
  const year = new Date().getFullYear();
  const n = Math.floor(100000 + Math.random() * 900000);
  return `CH-${year}-${n}`;
}

/**
 * Paga una reserva: crea el recibo, marca las butacas como vendidas y la reserva
 * como pagada. Rollback si algo falla a mitad.
 * @param {string} reservationId
 * @returns {Promise<object>} el registro de compra
 */
export async function payReservation(reservationId) {
  const user = getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");

  const reservation = await getById("reservations", reservationId);
  if (reservation.userId !== user.id) throw new Error("Esta reserva no es tuya.");
  if (reservation.status === RESERVATION_STATUS.PAID) {
    throw new Error("Esta reserva ya está pagada.");
  }
  if (reservation.status !== RESERVATION_STATUS.RESERVED) {
    throw new Error("Esta reserva no se puede pagar.");
  }

  const purchasedAt = new Date().toISOString();
  const purchase = {
    id: `pur-${crypto.randomUUID().slice(0, 8)}`,
    ticketId: makeTicketId(),
    userId: user.id,
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
    purchasedAt,
  };

  // 1. Recibo primero
  const created = await create("purchases", purchase);

  const functionSeatIds = reservation.functionSeatIds ?? [];

  // 2. Butacas -> sold
  const patched = [];
  try {
    for (const fsId of functionSeatIds) {
      await setSeatStatus(fsId, SEAT_STATUS.SOLD);
      patched.push(fsId);
    }
  } catch {
    await Promise.allSettled(patched.map((id) => setSeatStatus(id, SEAT_STATUS.RESERVED)));
    await remove("purchases", created.id).catch(() => {});
    throw new Error("No se pudo completar el pago. Inténtalo de nuevo.");
  }

  // 3. Reserva -> paid
  try {
    await update("reservations", reservation.id, {
      status: RESERVATION_STATUS.PAID,
      paidAt: purchasedAt,
      purchaseId: created.id,
    });
  } catch {
    await Promise.allSettled(functionSeatIds.map((id) => setSeatStatus(id, SEAT_STATUS.RESERVED)));
    await remove("purchases", created.id).catch(() => {});
    throw new Error("No se pudo completar el pago. Inténtalo de nuevo.");
  }

  return created;
}

/** Compras de un usuario, de la más reciente a la más antigua. */
export async function getUserPurchases(userId) {
  const list = await getAll("purchases", { userId });
  return list.sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
}

/** Compra asociada a una reserva (para la página del ticket). */
export async function getPurchaseByReservation(reservationId) {
  const list = await getAll("purchases", { reservationId });
  return list[0] ?? null;
}
