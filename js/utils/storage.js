// js/utils/storage.js
// Envoltorio mínimo sobre localStorage. Centraliza el JSON.parse/stringify y el
// try/catch (localStorage puede fallar: modo privado, cuota llena, bloqueado).

export function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nada que hacer */
  }
}
