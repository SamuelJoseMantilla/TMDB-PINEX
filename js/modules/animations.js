// js/modules/animations.js
// Animaciones de la Homepage con GSAP: entrada del Hero y aparición escalonada
// de las tarjetas al hacer scroll.

import { gsap, canAnimate } from "../lib/gsap.js";
import { $, $$ } from "../utils/dom.js";

/** Entrada cinematográfica del Hero. */
export function animateHero() {
  if (!canAnimate) return;

  const hero = $("#hero");
  if (!hero) return;

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.from(hero.querySelector("[data-hero-backdrop]"), { scale: 1.15, duration: 1.6, ease: "power2.out" }, 0)
    .from(hero.querySelector(".hero__eyebrow"), { y: 20, autoAlpha: 0, duration: 0.5 }, 0.25)
    .from(hero.querySelector("[data-hero-title]"), { y: 34, autoAlpha: 0, duration: 0.6 }, 0.35)
    .from(hero.querySelector("[data-hero-meta]"), { y: 18, autoAlpha: 0, duration: 0.5 }, 0.5)
    .from(hero.querySelector("[data-hero-overview]"), { y: 18, autoAlpha: 0, duration: 0.5 }, 0.58)
    .from(
      hero.querySelectorAll(".hero__actions > *"),
      { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.1 },
      0.66
    );
}

/**
 * Aparición escalonada de los hijos de un contenedor cuando entra en pantalla.
 * @param {string} containerSelector  p.ej. "#now-showing-grid"
 * @param {string} itemSelector       p.ej. ".movie-card"
 */
export function animateOnScroll(containerSelector, itemSelector) {
  if (!canAnimate) return;

  const container = $(containerSelector);
  if (!container) return;

  const items = $$(itemSelector, container);
  if (items.length === 0) return;

  gsap.from(items, {
    scrollTrigger: { trigger: container, start: "top 85%", once: true },
    y: 28,
    autoAlpha: 0,
    duration: 0.5,
    stagger: 0.07,
    ease: "power2.out",
  });
}
