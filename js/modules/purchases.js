// js/modules/purchases.js
// Convierte una reserva pagada en una compra.
//
// Pagar = UNA escritura bloqueante: POST /purchases. Una reserva se considera
// "pagada" si existe una compra para ella (estado DERIVADO, no guardado), igual
// que la disponibilidad de butacas. Esto evita encadenar escrituras (json-server
// local en Windows se atasca al hacerlo). D4 se sigue cumpliendo: la reserva no
// se borra; además se intenta marcar status "paid" en segundo plano.

import { getAll, getById, create, update } from "../services/api.service.js";
import { getCurrentUser } from "./auth.js";
import { RESERVATION_STATUS } from "./reservations.js";
import { checkSeatsAvailable } from "./seats.js";

function makeTicketId() {
  const year = new Date().getFullYear();
  const n = Math.floor(100000 + Math.random() * 900000);
  return `CH-${year}-${n}`;
}

function buildPurchase(user, reservation) {
  return {
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
    purchasedAt: new Date().toISOString(),
  };
}

/**
 * Paga una reserva. Devuelve el registro de compra.
 * @param {string} reservationId
 * @returns {Promise<object>}
 */
export async function payReservation(reservationId) {
  const user = getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");

  const reservation = await getById("reservations", reservationId);
  if (reservation.userId !== user.id) throw new Error("Esta reserva no es tuya.");
  if (reservation.status === RESERVATION_STATUS.CANCELLED) {
    throw new Error("Esta reserva está cancelada.");
  }

  // ¿Ya hay compra(s) para esta reserva? (doble clic, intento previo a medias)
  const existing = await getAll("purchases", { reservationId });
  let purchase = existing[0] ?? null;

  if (purchase) return purchase; // ya pagada (doble clic / reintento)

  // RF-13 · comprobar que las butacas no las haya comprado OTRO
  const check = await checkSeatsAvailable(reservation.functionId, reservation.seatIds);
  const conflict = check.unavailable.filter((id) => !reservation.seatIds.includes(id));
  if (conflict.length > 0) {
    throw new Error("Algunas butacas de esta reserva ya no están disponibles.");
  }

  // ÚNICA escritura bloqueante: crear la compra.
  const created = await create("purchases", buildPurchase(user, reservation));

  // Marcar la reserva "paid" es solo cosmético (el estado real se deriva de que
  // exista la compra). Lo intentamos SIN bloquear ni esperar: si json-server se
  // atasca, da igual.
  update("reservations", reservationId, {
    status: RESERVATION_STATUS.PAID,
    paidAt: created.purchasedAt,
    purchaseId: created.id,
  }).catch(() => {});

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
