// js/modules/ratings.js
// Reseñas y calificaciones de CINEHUB (colección `ratings` en JSON Server).
//   { id, userId, userName, mediaType: "movie"|"tv", tmdbId, score 1..5, comment, createdAt }
//
// Un usuario tiene como mucho UNA reseña por título (se actualiza, no se duplica).

import { getAll, getById, create, update, remove } from "../services/api.service.js";
import { getCurrentUser } from "./auth.js";

/** Reseñas de un título, de la más reciente a la más antigua. */
export async function getRatingsFor(mediaType, tmdbId) {
  const list = await getAll("ratings", { mediaType, tmdbId });
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** La reseña del usuario para este título (o null). */
export async function getUserRating(userId, mediaType, tmdbId) {
  const list = await getAll("ratings", { userId, mediaType, tmdbId });
  return list[0] ?? null;
}

/** Nota media y número de reseñas. */
export function averageRating(ratings) {
  if (ratings.length === 0) return { avg: 0, count: 0 };
  const sum = ratings.reduce((total, r) => total + r.score, 0);
  return { avg: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
}

/**
 * Guarda la reseña del usuario: crea una nueva o actualiza la que ya tenía.
 * @param {{ mediaType, tmdbId, score, comment }} data
 * @returns {Promise<object>}
 */
export async function saveRating({ mediaType, tmdbId, score, comment }) {
  const user = getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error("Elige una puntuación de 1 a 5 estrellas.");
  }

  const existing = await getUserRating(user.id, mediaType, tmdbId);
  const payload = {
    score,
    comment: (comment ?? "").trim().slice(0, 500),
    createdAt: new Date().toISOString(),
  };

  if (existing) {
    return update("ratings", existing.id, payload);
  }

  return create("ratings", {
    id: `rat-${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    userName: user.name,
    mediaType,
    tmdbId,
    ...payload,
  });
}

/** Borra una reseña (solo la propia; se comprueba el userId). */
export async function deleteRating(ratingId) {
  const user = getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");

  const rating = await getById("ratings", ratingId);
  if (rating.userId !== user.id) throw new Error("Esta reseña no es tuya.");

  return remove("ratings", ratingId);
}
