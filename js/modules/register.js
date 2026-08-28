// js/modules/register.js · pages/register.html

import "../components/site-header.js";
import "../components/site-footer.js";

import { register, isLoggedIn } from "./auth.js";
import { $ } from "../utils/dom.js";
import { sitePath } from "../utils/helpers.js";

if (isLoggedIn()) {
  location.replace(sitePath("index.html"));
}

const form = $("#register-form");
const feedback = $("#auth-feedback");
const submit = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedback.textContent = "";
  feedback.dataset.state = "";

  const password = $("#reg-password").value;
  const confirm = $("#reg-confirm").value;

  if (password !== confirm) {
    feedback.textContent = "Las contraseñas no coinciden.";
    feedback.dataset.state = "error";
    return;
  }

  submit.disabled = true;
  submit.textContent = "Creando…";

  try {
    await register({
      name: $("#reg-name").value,
      email: $("#reg-email").value,
      password,
    });
    location.href = sitePath("index.html");
  } catch (error) {
    feedback.textContent = error.message;
    feedback.dataset.state = "error";
    submit.disabled = false;
    submit.textContent = "Crear cuenta";
  }
});
