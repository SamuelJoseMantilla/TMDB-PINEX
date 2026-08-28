// js/utils/dom.js
// Atajos para trabajar con el DOM. Se usan en toda la app.

/** Primer elemento que coincide con el selector. */
export const $ = (selector, parent = document) => parent.querySelector(selector);

/** Todos los elementos que coinciden, como array (no NodeList). */
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/**
 * Clona un <template> por su id y devuelve su primer elemento.
 * Los <template> están al final de index.html: son "moldes" que JS rellena.
 */
export function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  if (!(tpl instanceof HTMLTemplateElement)) {
    throw new Error(`Template #${id} no encontrado`);
  }
  return tpl.content.firstElementChild.cloneNode(true);
}
