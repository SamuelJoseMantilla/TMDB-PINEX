// js/main.js
// Punto de entrada de la Homepage.
//
// Fase 7: solo la estructura HTML. Aquí de momento vive únicamente una
// interacción sencilla y sin datos: abrir / cerrar la barra de búsqueda.
//
// En la Fase 9 este archivo pasará a orquestar las secciones (Hero, Now Showing,
// Trending, etc.) importando sus módulos desde js/modules/.

console.log("CINEHUB · Homepage cargada (Fase 7 · solo estructura)");

/* ---- Barra de búsqueda del header (mostrar / ocultar) ------------------- */
function initSearchToggle() {
  const toggle = document.getElementById("search-toggle");
  const bar = document.getElementById("search-bar");
  const input = document.getElementById("search-input");
  if (!toggle || !bar || !input) return;

  toggle.addEventListener("click", () => {
    const willOpen = bar.hasAttribute("hidden");
    bar.toggleAttribute("hidden", !willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) input.focus();
  });

  // Cerrar con la tecla Escape mientras se escribe
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      bar.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });
}

initSearchToggle();
