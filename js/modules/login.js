// js/modules/login.js · pages/login.html

import "../components/site-header.js";
import "../components/site-footer.js";

import { login, isLoggedIn } from "./auth.js";
import { $ } from "../utils/dom.js";
import { sitePath } from "../utils/helpers.js";

// Si ya hay sesión, no tiene sentido ver el login.
if (isLoggedIn()) {
  location.replace(sitePath("index.html"));
}

const form = $("#login-form");
const feedback = $("#auth-feedback");
const submit = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedback.textContent = "";
  feedback.dataset.state = "";

  submit.disabled = true;
  submit.textContent = "Entrando…";

  try {
    await login({
      email: $("#login-email").value,
      password: $("#login-password").value,
    });

    // Volver a donde el usuario quería ir (si venía de una página protegida).
    const next = new URLSearchParams(location.search).get("next");
    location.href = next || sitePath("index.html");
  } catch (error) {
    feedback.textContent = error.message;
    feedback.dataset.state = "error";
    submit.disabled = false;
    submit.textContent = "Iniciar sesión";
  }
});
