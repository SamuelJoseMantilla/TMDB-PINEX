// js/modules/auth.js
// Autenticación SIMULADA para el proyecto académico (JSON Server, sin backend real).
//
// La "sesión" es un objeto { id, name, email } en localStorage. NUNCA se guarda
// la contraseña. La comprobación de contraseña se hace en el cliente comparando
// contra lo que devuelve GET /users?email=...

import { getAll, create } from "../services/api.service.js";
import { readJSON, writeJSON, removeKey } from "../utils/storage.js";
import { sitePath } from "../utils/helpers.js";

const SESSION_KEY = "cinehub_user";

/* --------------------------- estado de sesión ------------------------- */

export function getCurrentUser() {
  return readJSON(SESSION_KEY); // { id, name, email } | null
}

export function isLoggedIn() {
  return getCurrentUser() !== null;
}

function startSession(user) {
  const session = { id: user.id, name: user.name, email: user.email };
  writeJSON(SESSION_KEY, session);
  return session;
}

export function logout() {
  removeKey(SESSION_KEY);
}

/* ------------------------------- login ------------------------------- */

export async function login({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error("Introduce tu correo y tu contraseña.");
  }

  const users = await getAll("users", { email: cleanEmail });
  const user = users[0];

  if (!user || user.password !== password) {
    throw new Error("Correo o contraseña incorrectos.");
  }

  return startSession(user);
}

/* ----------------------------- registro ----------------------------- */

export async function register({ name, email, password }) {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanName.length < 2) throw new Error("El nombre es demasiado corto.");
  if (!isValidEmail(cleanEmail)) throw new Error("Ese correo no parece válido.");
  if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");

  const existing = await getAll("users", { email: cleanEmail });
  if (existing.length > 0) {
    throw new Error("Ya existe una cuenta con ese correo.");
  }

  const newUser = {
    id: `user-${crypto.randomUUID().slice(0, 8)}`,
    name: cleanName,
    email: cleanEmail,
    password, // json-server lo guarda tal cual; es un proyecto académico
  };

  await create("users", newUser);
  return startSession(newUser);
}

/* --------------------------- páginas protegidas --------------------- */

/**
 * Llamar al principio de una página que exige sesión (reservas, pago, ticket).
 * Si no hay sesión, redirige a login guardando a dónde volver.
 * @returns {boolean} true si hay sesión
 */
export function requireAuth() {
  if (isLoggedIn()) return true;
  const next = encodeURIComponent(location.pathname + location.search);
  location.href = sitePath(`pages/login.html?next=${next}`);
  return false;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
