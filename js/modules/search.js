// js/modules/search.js
// Barra de búsqueda del header: abrir/cerrar y enviar la consulta.
// La página de resultados (pages/search.html) se construye en una fase posterior;
// aquí solo navegamos hacia ella con ?q=...

import { $ } from "../utils/dom.js";

export function initHeaderSearch() {
  const toggle = $("#search-toggle");
  const bar = $("#search-bar");
  const input = $("#search-input");
  if (!toggle || !bar || !input) return;

  /* ---- abrir / cerrar ---- */
  toggle.addEventListener("click", () => {
    const willOpen = bar.hasAttribute("hidden");
    bar.toggleAttribute("hidden", !willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) input.focus();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      bar.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });

  /* ---- enviar ---- */
  bar.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }
    window.location.href = `pages/search.html?q=${encodeURIComponent(query)}`;
  });
}
