// js/components/app-modal.js
// <app-modal> · Web Component reutilizable (trailer en Fase 9, ticket en Fase 22).
//
// Cómo funciona un Web Component:
//   1. class X extends HTMLElement  -> defines el comportamiento de una etiqueta.
//   2. attachShadow()               -> un DOM interno aislado (estilos que no se
//                                      escapan ni entran).
//   3. customElements.define("app-modal", X)  -> registra <app-modal> en el navegador.
//
// Uso desde JS:
//   const modal = document.querySelector("app-modal");
//   modal.setContent(algúnNodo);   // mete contenido
//   modal.open();                  // muestra
//   modal.close();                 // oculta y limpia el contenido

import { gsap, canAnimate } from "../lib/gsap.js";

class AppModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }

        .backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
        }
        .dialog {
          position: relative;
          max-width: min(92vw, 960px);
          width: 100%;
          background: #161618;
          border: 1px solid #2c2c33;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }
        .close {
          position: absolute;
          top: -14px;
          right: -14px;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: none;
          background: #ff9000;
          color: #140c00;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
        }
        .close:hover { background: #ffa733; }
        @media (max-width: 520px) {
          .close { top: 8px; right: 8px; }
        }
      </style>

      <div class="backdrop" part="backdrop">
        <div class="dialog" role="dialog" aria-modal="true">
          <button class="close" type="button" aria-label="Cerrar">✕</button>
          <div class="content"><slot></slot></div>
        </div>
      </div>
    `;

    this.shadowRoot.querySelector(".close").addEventListener("click", () => this.close());
    this.shadowRoot.querySelector(".backdrop").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) this.close();
    });
  }

  /** Reemplaza el contenido del modal (se pasa un nodo del DOM "de luz"). */
  setContent(node) {
    this.replaceChildren(node);
  }

  open() {
    this.setAttribute("open", "");
    document.addEventListener("keydown", this._handleKeydown);
    document.body.style.overflow = "hidden";
    this.shadowRoot.querySelector(".close").focus();

    if (canAnimate) {
      const backdrop = this.shadowRoot.querySelector(".backdrop");
      const dialog = this.shadowRoot.querySelector(".dialog");
      gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
      gsap.fromTo(
        dialog,
        { y: 24, scale: 0.92, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.35, ease: "power3.out" }
      );
    }
  }

  close() {
    if (canAnimate) {
      const dialog = this.shadowRoot.querySelector(".dialog");
      gsap.to(dialog, {
        y: 16,
        scale: 0.94,
        autoAlpha: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => this.#finishClose(),
      });
    } else {
      this.#finishClose();
    }
  }

  #finishClose() {
    this.removeAttribute("open");
    document.removeEventListener("keydown", this._handleKeydown);
    document.body.style.overflow = "";
    this.replaceChildren(); // vacía el contenido -> detiene el vídeo del iframe
    this.dispatchEvent(new CustomEvent("modal:close"));
  }

  _handleKeydown(event) {
    if (event.key === "Escape") this.close();
  }
}

customElements.define("app-modal", AppModal);
