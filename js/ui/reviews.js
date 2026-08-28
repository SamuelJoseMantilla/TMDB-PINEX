// js/ui/reviews.js
// Sección "Reseñas" reutilizable (ficha de película y de serie).
//   mountReviews(container, { mediaType, tmdbId })

import {
  getRatingsFor,
  getUserRating,
  averageRating,
  saveRating,
  deleteRating,
} from "../modules/ratings.js";
import { isLoggedIn, getCurrentUser } from "../modules/auth.js";
import { setError } from "../ui/states.js";
import { formatReleaseDate, sitePath } from "../utils/helpers.js";

const stars = (n) => "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);

export async function mountReviews(container, { mediaType, tmdbId }) {
  container.innerHTML = `<p class="state">Cargando reseñas…</p>`;

  let ratings;
  try {
    ratings = await getRatingsFor(mediaType, tmdbId);
  } catch {
    setError(container, "No se pudieron cargar las reseñas.", () =>
      mountReviews(container, { mediaType, tmdbId })
    );
    return;
  }

  const { avg, count } = averageRating(ratings);
  const mine = isLoggedIn()
    ? await getUserRating(getCurrentUser().id, mediaType, tmdbId).catch(() => null)
    : null;

  container.innerHTML = `
    <div class="reviews__summary">
      ${
        count > 0
          ? `<span class="reviews__avg">★ ${avg.toFixed(1)}</span>
             <span class="reviews__count">${count} reseña${count === 1 ? "" : "s"} de CINEHUB</span>`
          : `<span class="reviews__count">Todavía no hay reseñas. Sé el primero.</span>`
      }
    </div>

    <div class="reviews__form-wrap" id="reviews-form-wrap"></div>

    <ul class="reviews__list" id="reviews-list"></ul>
  `;

  renderForm(container.querySelector("#reviews-form-wrap"), { mediaType, tmdbId, mine, container });
  renderList(container.querySelector("#reviews-list"), ratings, mine);
}

/* ------------------------------- formulario --------------------------- */

function renderForm(wrap, { mediaType, tmdbId, mine, container }) {
  if (!isLoggedIn()) {
    const next = encodeURIComponent(location.pathname + location.search);
    wrap.innerHTML = `
      <p class="reviews__login">
        <a href="${sitePath(`pages/login.html?next=${next}`)}">Inicia sesión</a> para dejar tu reseña.
      </p>`;
    return;
  }

  const current = mine?.score ?? 0;
  wrap.innerHTML = `
    <form class="review-form" id="review-form">
      <span class="review-form__label">${mine ? "Edita tu reseña" : "Tu reseña"}</span>
      <div class="star-input" id="star-input" role="radiogroup" aria-label="Puntuación">
        ${[1, 2, 3, 4, 5]
          .map(
            (n) => `<button type="button" class="star-input__star" data-score="${n}"
              role="radio" aria-checked="${n === current}" aria-label="${n} estrella${n === 1 ? "" : "s"}">★</button>`
          )
          .join("")}
      </div>
      <textarea class="field__control review-form__text" id="review-comment"
        rows="3" maxlength="500" placeholder="Escribe un comentario (opcional)…">${mine?.comment ?? ""}</textarea>
      <p class="review-form__error" id="review-error" hidden></p>
      <div class="review-form__actions">
        <button type="submit" class="button button--primary button--sm">${mine ? "Actualizar" : "Publicar"}</button>
        ${mine ? `<button type="button" class="button button--ghost button--sm" id="review-delete">Eliminar</button>` : ""}
      </div>
    </form>
  `;

  let score = current;
  const starInput = wrap.querySelector("#star-input");
  const paint = (value) => {
    for (const star of starInput.children) {
      star.classList.toggle("is-on", Number(star.dataset.score) <= value);
      star.setAttribute("aria-checked", String(Number(star.dataset.score) === score));
    }
  };
  paint(score);

  starInput.addEventListener("click", (e) => {
    const star = e.target.closest(".star-input__star");
    if (!star) return;
    score = Number(star.dataset.score);
    paint(score);
  });
  starInput.addEventListener("mouseover", (e) => {
    const star = e.target.closest(".star-input__star");
    if (star) paint(Number(star.dataset.score));
  });
  starInput.addEventListener("mouseleave", () => paint(score));

  const form = wrap.querySelector("#review-form");
  const errEl = wrap.querySelector("#review-error");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errEl.hidden = true;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      await saveRating({
        mediaType,
        tmdbId,
        score,
        comment: wrap.querySelector("#review-comment").value,
      });
      mountReviews(container, { mediaType, tmdbId }); // recargar la sección
    } catch (error) {
      errEl.textContent = error.message;
      errEl.hidden = false;
      btn.disabled = false;
    }
  });

  wrap.querySelector("#review-delete")?.addEventListener("click", async () => {
    if (!confirm("¿Eliminar tu reseña?")) return;
    try {
      await deleteRating(mine.id);
      mountReviews(container, { mediaType, tmdbId });
    } catch (error) {
      alert(error.message);
    }
  });
}

/* --------------------------------- lista ----------------------------- */

function renderList(list, ratings, mine) {
  if (ratings.length === 0) {
    list.innerHTML = "";
    return;
  }

  list.replaceChildren(
    ...ratings.map((r) => {
      const li = document.createElement("li");
      li.className = "review";
      if (mine && r.id === mine.id) li.classList.add("review--mine");
      li.innerHTML = `
        <div class="review__head">
          <span class="review__author">${r.userName ?? "Usuario"}${
            mine && r.id === mine.id ? " · tú" : ""
          }</span>
          <span class="review__stars" title="${r.score} de 5">${stars(r.score)}</span>
        </div>
        ${r.comment ? `<p class="review__text"></p>` : ""}
        <span class="review__date">${formatReleaseDate(r.createdAt.slice(0, 10))}</span>
      `;
      if (r.comment) li.querySelector(".review__text").textContent = r.comment;
      return li;
    })
  );
}
