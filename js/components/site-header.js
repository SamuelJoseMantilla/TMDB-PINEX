// js/components/site-header.js
// <site-header> · Web Component de "light DOM" (sin Shadow DOM) para el header.
//
// Se renderiza en el DOM normal, así que el CSS de components.css sigue aplicando
// y document.getElementById(...) encuentra sus elementos. Es un Web Component de
// verdad (extends HTMLElement + customElements.define), solo que sin la
// encapsulación del Shadow DOM, innecesaria para maquetación compartida.
//
// Uso:  <site-header active="movies"></site-header>
// El atributo `active` marca el enlace de navegación correspondiente.

import { sitePath } from "../utils/helpers.js";
import { getCurrentUser, logout } from "../modules/auth.js";

const LOGO_SVG = `
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M4 4h16a1 1 0 0 1 1 1v3H3V5a1 1 0 0 1 1-1Zm-1 6h18v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Zm4-4-2 2h3l2-2H7Zm5 0-2 2h3l2-2h-3Zm5 0-2 2h3l2-2h-3Z" />
  </svg>`;

const SEARCH_SVG = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>`;

const USER_SVG = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>`;

const MENU_SVG = `
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
  </svg>`;

const NAV_ITEMS = [
  { key: "home", label: "Home", href: "index.html" },
  { key: "movies", label: "Movies", href: "pages/movies.html" },
  { key: "categories", label: "Categories", href: "pages/category.html" },
  { key: "trending", label: "Trending", href: "index.html#trending" },
  { key: "trailers", label: "Trailers", href: "index.html#trailers" },
  { key: "reservations", label: "My Reservations", href: "pages/reservations.html" },
];

class SiteHeader extends HTMLElement {
  connectedCallback() {
    const active = this.getAttribute("active") ?? this.#guessActive();

    const navHtml = NAV_ITEMS.map(
      (item) =>
        `<li><a class="main-nav__link${item.key === active ? " is-active" : ""}"
          href="${sitePath(item.href)}">${item.label}</a></li>`
    ).join("");

    this.innerHTML = `
      <header class="site-header">
        <div class="site-header__inner container">
          <button type="button" class="icon-button nav-toggle" id="nav-toggle"
            aria-label="Abrir menú" aria-expanded="false" aria-controls="main-nav">
            ${MENU_SVG}
          </button>

          <a class="logo" href="${sitePath("index.html")}" aria-label="CINEHUB, inicio">
            <span class="logo__icon" aria-hidden="true">${LOGO_SVG}</span>
            <span class="logo__text">CINEHUB</span>
          </a>

          <nav class="main-nav" id="main-nav" aria-label="Navegación principal">
            <ul class="main-nav__list">${navHtml}</ul>
          </nav>

          <div class="site-header__actions">
            <button type="button" class="icon-button" id="search-toggle"
              aria-label="Buscar películas" aria-expanded="false" aria-controls="search-bar">
              ${SEARCH_SVG}
            </button>
            ${this.#renderAuthArea()}
          </div>
        </div>

        <form class="search-bar container" id="search-bar" role="search" hidden>
          <label class="visually-hidden" for="search-input">Buscar películas</label>
          <input type="search" id="search-input" name="q" class="search-bar__input"
            placeholder="Busca una película por título…" autocomplete="off" />
          <button type="submit" class="button button--primary button--sm">Buscar</button>
        </form>
      </header>
    `;

    this.#wireSearch();
    this.#wireUserMenu();
    this.#wireNavToggle();
  }

  #wireNavToggle() {
    const toggle = this.querySelector("#nav-toggle");
    const nav = this.querySelector("#main-nav");

    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    });

    // Cerrar al pulsar un enlace del menú
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menú");
      }
    });
  }

  /** Zona derecha del header: "Login" si no hay sesión, menú de usuario si la hay. */
  #renderAuthArea() {
    const user = getCurrentUser();

    if (!user) {
      return `
        <a class="icon-button" href="${sitePath("pages/login.html")}" id="user-menu" aria-label="Mi cuenta">
          ${USER_SVG}
        </a>
        <a class="button button--primary button--sm" href="${sitePath("pages/login.html")}" id="login-button">
          Login
        </a>`;
    }

    const firstName = user.name.split(" ")[0];
    return `
      <div class="user-menu" id="user-menu">
        <button type="button" class="user-menu__trigger" aria-expanded="false" aria-haspopup="true">
          ${USER_SVG}<span>${firstName}</span>
        </button>
        <div class="user-menu__dropdown" hidden>
          <a href="${sitePath("pages/reservations.html")}">My Reservations</a>
          <a href="${sitePath("pages/tickets.html")}">My Tickets</a>
          <button type="button" class="user-menu__logout">Cerrar sesión</button>
        </div>
      </div>`;
  }

  #wireUserMenu() {
    const trigger = this.querySelector(".user-menu__trigger");
    if (!trigger) return;

    const dropdown = this.querySelector(".user-menu__dropdown");

    trigger.addEventListener("click", () => {
      const willOpen = dropdown.hasAttribute("hidden");
      dropdown.toggleAttribute("hidden", !willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
    });

    // Cerrar al hacer clic fuera
    document.addEventListener("click", (event) => {
      if (!this.contains(event.target)) {
        dropdown.setAttribute("hidden", "");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    this.querySelector(".user-menu__logout").addEventListener("click", () => {
      logout();
      window.location.href = sitePath("index.html");
    });
  }

  #guessActive() {
    const path = location.pathname;
    if (path.endsWith("/") || path.endsWith("index.html")) return "home";
    if (path.includes("movie")) return "movies";
    if (path.includes("categor")) return "categories";
    if (path.includes("reservation")) return "reservations";
    return "";
  }

  #wireSearch() {
    const toggle = this.querySelector("#search-toggle");
    const bar = this.querySelector("#search-bar");
    const input = this.querySelector("#search-input");

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

    bar.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = input.value.trim();
      if (!query) {
        input.focus();
        return;
      }
      window.location.href = sitePath(`pages/search.html?q=${encodeURIComponent(query)}`);
    });
  }
}

customElements.define("site-header", SiteHeader);
