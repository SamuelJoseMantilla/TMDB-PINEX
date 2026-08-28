// js/services/api.service.js
// ÚNICO módulo que habla con JSON Server. El resto del código nunca hace fetch
// a http://localhost:3000 directamente: usa estas funciones.
//
// Expone un CRUD genérico:
//   getAll(resource, query?)   -> GET    /resource?...
//   getById(resource, id)      -> GET    /resource/id
//   create(resource, data)     -> POST   /resource
//   update(resource, id, data) -> PATCH  /resource/id   (modifica solo lo enviado)
//   replace(resource, id, data)-> PUT    /resource/id
//   remove(resource, id)       -> DELETE /resource/id

import { API_BASE_URL } from "../config.js";

/**
 * Envoltorio central sobre fetch. Centraliza:
 *  - la URL base
 *  - la cabecera Content-Type
 *  - el manejo de errores de red y de códigos HTTP
 * @param {string} path  ruta que empieza por "/", p.ej. "/reservations"
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (networkError) {
    // fetch solo lanza si NO hay respuesta (servidor caído, sin red, CORS).
    throw new Error(
      "No se pudo conectar con el servidor de CINEHUB. ¿Ejecutaste 'npm start'?"
    );
  }

  if (!response.ok) {
    // 4xx / 5xx: la petición llegó pero el servidor respondió con error.
    const method = options.method ?? "GET";
    throw new Error(`Error ${response.status} en ${method} ${path}`);
  }

  if (response.status === 204) return null; // No Content (algunos DELETE)

  return response.json();
}

/**
 * Convierte un objeto { date: "2026-08-28", userId: "user-1" }
 * en la query string "?date=2026-08-28&userId=user-1".
 * Ignora valores null / undefined / "".
 */
function toQueryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") {
      params.append(key, value);
    }
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

/* ------------------------------- CRUD ------------------------------------ */

export function getAll(resource, query = {}) {
  return request(`/${resource}${toQueryString(query)}`);
}

export function getById(resource, id) {
  return request(`/${resource}/${id}`);
}

export function create(resource, data) {
  return request(`/${resource}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function update(resource, id, partialData) {
  return request(`/${resource}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(partialData),
  });
}

export function replace(resource, id, data) {
  return request(`/${resource}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function remove(resource, id) {
  return request(`/${resource}/${id}`, { method: "DELETE" });
}
