// js/ui/states.js
// Estados visuales reutilizables para cualquier contenedor que carga datos:
// loading / error / empty / ready. El CSS reacciona a [data-state] y a .state.

function makeStateEl(container, kind, message) {
  // Dentro de <ul>/<ol> el hijo debe ser <li>; en un <div> vale <p>.
  const tag = /^(UL|OL)$/.test(container.tagName) ? "li" : "p";
  const el = document.createElement(tag);
  el.className = `state state--${kind}`;
  el.textContent = message;
  return el;
}

export function setLoading(container, message = "Loading…") {
  container.dataset.state = "loading";
  container.replaceChildren(makeStateEl(container, "loading", message));
}

export function setEmpty(container, message = "No results found.") {
  container.dataset.state = "empty";
  container.replaceChildren(makeStateEl(container, "empty", message));
}

export function setError(container, message = "Something went wrong.", onRetry) {
  container.dataset.state = "error";
  const el = makeStateEl(container, "error", message);
  if (typeof onRetry === "function") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button--ghost button--sm";
    button.textContent = "Try again";
    button.addEventListener("click", onRetry);
    el.append(document.createElement("br"), button);
  }
  container.replaceChildren(el);
}

export function setReady(container) {
  container.dataset.state = "ready";
}
