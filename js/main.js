// js/main.js
// Punto de entrada de la Homepage.
// En la Fase 3 solo comprueba que:
//   1. El navegador carga y ejecuta módulos ES (import/export).
//   2. JSON Server responde en http://localhost:3000
// Este contenido se reemplazará por la lógica real a partir de la Fase 7.

console.log("CINEHUB · frontend cargado");

const statusEl = document.getElementById("status");

async function checkJsonServer() {
  try {
    const res = await fetch("http://localhost:3000/users");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const users = await res.json();
    console.log("JSON Server responde. users =", users);
    statusEl.textContent = `JSON Server OK · ${users.length} usuarios en db.json`;
    statusEl.style.color = "var(--color-primary)";
  } catch (error) {
    console.warn("JSON Server no responde todavía:", error.message);
    statusEl.textContent =
      "JSON Server no responde. ¿Ejecutaste 'npm start' o 'npm run api'?";
  }
}

checkJsonServer();
