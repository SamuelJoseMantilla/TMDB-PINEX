// js/lib/gsap.js
// GSAP se carga como global (assets/vendor/gsap.min.js + ScrollTrigger.min.js).
// Este módulo lo reexpone para poder importarlo con ES modules.
//
// Si GSAP no está cargado, o el usuario pidió menos movimiento
// (prefers-reduced-motion), `gsap` es null y `canAnimate` es false: cada
// animación comprueba eso y simplemente no hace nada.

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const gsap = prefersReducedMotion ? null : window.gsap ?? null;
export const ScrollTrigger = window.ScrollTrigger ?? null;

if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

export const canAnimate = Boolean(gsap);
