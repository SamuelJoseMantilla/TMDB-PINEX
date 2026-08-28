// js/modules/favorites.js
// Favoritos del usuario. Colección `favorites` en JSON Server:
//   { id, userId, mediaType: "movie" | "tv", tmdbId, title, posterPath, addedAt }
//
// Cada acción es UNA escritura (POST o DELETE), sin encadenar -> sin problemas.

import { getAll, create, remove } from "../services/api.service.js";
import { getCurrentUser } from "./auth.js";

/** Favoritos del usuario (más recientes primero). */
export async function getUserFavorites(userId) {
  const list = await getAll("favorites", { userId });
  return list.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

/**
 * Busca el favorito de este usuario para un título concreto.
 * @returns {Promise<object|null>}
 */
export async function findFavorite(userId, mediaType, tmdbId) {
  const list = await getAll("favorites", { userId, mediaType, tmdbId });
  return list[0] ?? null;
}

/**
 * Añade o quita de favoritos (toggle).
 * @param {{ mediaType, tmdbId, title, posterPath }} media
 * @returns {Promise<boolean>} true si quedó como favorito, false si se quitó
 */
export async function toggleFavorite(media) {
  const user = getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");

  const existing = await findFavorite(user.id, media.mediaType, media.tmdbId);

  if (existing) {
    await remove("favorites", existing.id);
    return false;
  }

  await create("favorites", {
    id: `fav-${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    mediaType: media.mediaType,
    tmdbId: media.tmdbId,
    title: media.title,
    posterPath: media.posterPath ?? null,
    addedAt: new Date().toISOString(),
  });
  return true;
}
