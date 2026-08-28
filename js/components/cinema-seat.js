// js/components/cinema-seat.js
// <cinema-seat> · Web Component con Shadow DOM para una butaca del mapa de sillas.
//
//   <cinema-seat seat-code="C5" status="available" location="center" recommended>
//   </cinema-seat>
//
// El Shadow DOM aísla los estilos. Las variables CSS del sitio (--color-*) sí
// entran, así que los colores son los de CINEHUB.
//
// Estados: available -> selected (clic) -> available (clic) ; reserved / sold no
// son seleccionables. Al cambiar, emite el evento "seat-toggle".

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
      --seat-size: 30px;
    }
    button {
      width: var(--seat-size);
      height: var(--seat-size);
      padding: 0;
      font: 700 10px/1 inherit;
      font-family: inherit;
      border-radius: 7px 7px 4px 4px;
      border: 1px solid var(--color-border-strong, #3c3c45);
      background: var(--color-surface-3, #2a2a31);
      color: var(--color-text-dim, #67676f);
      cursor: pointer;
      transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
    }
    button:hover:not(:disabled) {
      transform: translateY(-2px);
    }
    button:disabled {
      cursor: not-allowed;
    }
    button:focus-visible {
      outline: 2px solid var(--color-primary, #ff9000);
      outline-offset: 2px;
    }

    :host([status="available"]) button {
      background: color-mix(in srgb, var(--color-success, #3ecf8e) 16%, transparent);
      border-color: var(--color-success, #3ecf8e);
      color: var(--color-success, #3ecf8e);
    }
    :host([status="selected"]) button {
      background: var(--color-primary, #ff9000);
      border-color: var(--color-primary, #ff9000);
      color: var(--color-on-primary, #140c00);
    }
    :host([status="reserved"]) button {
      background: color-mix(in srgb, #b98a2e 20%, transparent);
      border-color: #b98a2e;
      color: #d7a850;
    }
    :host([status="sold"]) button {
      background: var(--color-surface-2, #1f1f23);
      border-color: var(--color-border, #2c2c33);
      color: var(--color-text-dim, #55555c);
    }
    :host([recommended][status="available"]) button {
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary, #ff9000) 55%, transparent);
    }
  </style>
  <button type="button"></button>
`;

const SELECTABLE = new Set(["available", "selected"]);
const STATUS_LABEL = {
  available: "disponible",
  selected: "seleccionada",
  reserved: "reservada",
  sold: "ocupada",
};

class CinemaSeat extends HTMLElement {
  static get observedAttributes() {
    return ["status", "seat-code", "recommended"];
  }

  // Datos que asigna el padre (no son atributos: son referencias, no presentación)
  seatId = null;
  functionSeatId = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" }).append(template.content.cloneNode(true));
    this._button = this.shadowRoot.querySelector("button");
  }

  connectedCallback() {
    if (!this.hasAttribute("status")) this.setAttribute("status", "available");
    this._button.addEventListener("click", () => this._handleClick());
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  get status() {
    return this.getAttribute("status");
  }
  set status(value) {
    this.setAttribute("status", value);
  }
  get selected() {
    return this.status === "selected";
  }

  _handleClick() {
    if (this.status === "available") {
      this.setAttribute("status", "selected");
    } else if (this.status === "selected") {
      this.setAttribute("status", "available");
    } else {
      return; // reserved / sold: no seleccionable
    }

    this.dispatchEvent(
      new CustomEvent("seat-toggle", {
        bubbles: true,
        composed: true, // deja salir el evento del Shadow DOM
        detail: {
          seatId: this.seatId,
          functionSeatId: this.functionSeatId,
          seatCode: this.getAttribute("seat-code"),
          location: this.getAttribute("location"),
          selected: this.selected,
        },
      })
    );
  }

  _render() {
    const code = this.getAttribute("seat-code") ?? "";
    const status = this.status ?? "available";

    this._button.textContent = code;
    this._button.disabled = !SELECTABLE.has(status);
    this._button.setAttribute("aria-pressed", String(status === "selected"));

    const rec =
      this.hasAttribute("recommended") && status === "available" ? ", mejor vista" : "";
    this._button.setAttribute(
      "aria-label",
      `Butaca ${code}, ${STATUS_LABEL[status] ?? status}${rec}`
    );
  }
}

customElements.define("cinema-seat", CinemaSeat);
