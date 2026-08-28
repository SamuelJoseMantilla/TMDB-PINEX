// js/utils/helpers.js
// Funciones puras de formato y utilidades. Sin DOM, sin fetch.

/** 154  ->  "2h 34m"  ·  95  ->  "1h 35m"  ·  0/undefined  ->  "" */
export function formatRuntime(minutes) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** "2024-02-27"  ->  "2024" */
export function formatYear(dateStr) {
  return dateStr ? dateStr.slice(0, 4) : "";
}

/** 7.842  ->  "★ 7.8" */
export function formatRating(vote) {
  if (!vote) return "";
  return `★ ${Number(vote).toFixed(1)}`;
}

/** "2024-12-15"  ->  "15 dic 2024" */
export function formatReleaseDate(dateStr, locale = "es-ES") {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Etiqueta amigable para una fecha ISO en un <select>.
 * "2026-08-28" -> "Hoy · vie 28 ago"   ·   mañana -> "Mañana · ..."
 */
export function dateOptionLabel(iso, locale = "es-ES") {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date - today) / 86_400_000);

  const nice = date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  if (diffDays === 0) return `Hoy · ${nice}`;
  if (diffDays === 1) return `Mañana · ${nice}`;
  return nice;
}

/** 18000 -> "$18.000"  (pesos colombianos, sin decimales) */
export function formatMoney(amount, currency = "COP", locale = "es-CO") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Nombres de género de una película.
 * - endpoint de detalle:  movie.genres = [{id, name}]
 * - endpoints de lista:    movie.genre_ids = [28, 12]  (hay que traducir con genreMap)
 */
export function genreNames(movie, genreMap) {
  if (Array.isArray(movie.genres)) {
    return movie.genres.map((g) => g.name);
  }
  if (Array.isArray(movie.genre_ids) && genreMap) {
    return movie.genre_ids.map((id) => genreMap.get(id)).filter(Boolean);
  }
  return [];
}

/**
 * Elige el mejor vídeo para mostrar como trailer.
 * Prioridad: Trailer oficial de YouTube > cualquier Trailer > Teaser > el primero.
 */
export function pickTrailer(videos = []) {
  const youtube = videos.filter((v) => v.site === "YouTube");
  return (
    youtube.find((v) => v.type === "Trailer" && v.official) ||
    youtube.find((v) => v.type === "Trailer") ||
    youtube.find((v) => v.type === "Teaser") ||
    youtube[0] ||
    null
  );
}

/**
 * Devuelve una versión de `fn` que espera `delay` ms de "silencio" antes de
 * ejecutarse. Útil para búsquedas mientras se escribe.
 */
export function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Poster gris para películas sin imagen en TMDB. */
export const POSTER_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='342' height='513'%3E%3Crect width='100%25' height='100%25' fill='%231f1f23'/%3E%3Ctext x='50%25' y='50%25' fill='%2367676f' font-family='sans-serif' font-size='18' text-anchor='middle' dominant-baseline='middle'%3ESin imagen%3C/text%3E%3C/svg%3E";
