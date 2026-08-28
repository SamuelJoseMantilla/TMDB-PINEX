// js/components/site-footer.js
// <site-footer> · Web Component de "light DOM" para el pie de página compartido.

import { sitePath } from "../utils/helpers.js";

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="site-footer">
        <div class="site-footer__inner container">
          <div class="site-footer__brand">
            <span class="logo logo--footer"><span class="logo__text">CINEHUB</span></span>
            <p class="site-footer__desc">The premium destination for cinematic experiences.</p>
          </div>

          <nav class="site-footer__col" aria-label="Explore">
            <h2 class="site-footer__heading">Explore</h2>
            <ul>
              <li><a href="${sitePath("pages/movies.html")}">Movies</a></li>
              <li><a href="${sitePath("pages/category.html")}">Categories</a></li>
              <li><a href="${sitePath("index.html#trending")}">Trending</a></li>
            </ul>
          </nav>

          <nav class="site-footer__col" aria-label="Account">
            <h2 class="site-footer__heading">Account</h2>
            <ul>
              <li><a href="${sitePath("pages/reservations.html")}">My Reservations</a></li>
              <li><a href="${sitePath("pages/tickets.html")}">My Tickets</a></li>
            </ul>
          </nav>

          <nav class="site-footer__col" aria-label="Company">
            <h2 class="site-footer__heading">Company</h2>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Terms &amp; Privacy</a></li>
            </ul>
          </nav>
        </div>

        <p class="site-footer__legal">© 2026 CINEHUB. All rights reserved.</p>
      </footer>
    `;
  }
}

customElements.define("site-footer", SiteFooter);
