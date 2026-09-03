# Cómo agregar un requerimiento nuevo a CINEHUB

Guía para cuando el profesor pida una funcionalidad que todavía no sabes cuál es.
La idea: identificar **de qué tipo** es el requerimiento, copiar el esqueleto
correspondiente y rellenarlo. Los esqueletos siguen las convenciones que ya usa
el proyecto, así que encajan sin pelear con la estructura.

---

## 1. El patrón del proyecto en 1 minuto

Todo dato entra por una **capa de servicio**, se procesa en un **módulo de
lógica**, se convierte en HTML en la **capa de UI** y se muestra en una **página**.

```
TMDB   ─►  services/tmdb.service.js  ─┐
                                      ├─►  modules/<feature>.js  ─►  ui/*  ─►  pages/*.html
db.json ─►  services/api.service.js  ─┘         (la lógica)        (pintar)   (la pantalla)
```

Reglas que NO se rompen nunca:

| Regla | Por qué |
|---|---|
| Solo `services/` hace `fetch`. | Si una URL cambia, tocas un archivo. |
| Cada escritura a `db.json` va **sola** (no encadenar POST+PATCH). | JSON Server en Windows pierde escrituras encadenadas. |
| El estado que se puede **calcular**, se calcula (no se guarda). | Ver `seats.js`: la disponibilidad se deriva de reservas + compras. |
| IDs: `` `<prefijo>-${crypto.randomUUID().slice(0, 8)}` ``. | Consistencia con `res-`, `fav-`, `rat-`, `user-`. |
| Fechas: `new Date().toISOString()`. | Ordenar con `.localeCompare()`. |
| Estados de carga: `setLoading / setEmpty / setError / setReady` de `ui/states.js`. | UI uniforme. |
| Página nueva → `<link>` de CSS con `?v=4` (sube el número si tocas CSS). | Cache-busting. |
| Funcionalidad nueva → rama `feat/<nombre>` + Pull Request. | Lo exige el profesor. |

---

## 2. Árbol de decisión: ¿qué tipo de requerimiento es?

Responde de arriba abajo. El primer "sí" te da el arquetipo.

1. **¿Es mostrar más datos de TMDB** (una lista, una sección, un dato en una ficha)
   sin guardar nada? → **Arquetipo A** ().

2. **¿El usuario guarda / marca / apunta algo suyo** (lista de "ver después",
   historial, notas, "me interesa", valorar la sala…)? → **Arquetipo B** (§5).
   *Es el más frecuente. `favorites` y `ratings` ya son de este tipo.*

3. **¿Cambia el flujo de reservar o pagar** (tipos de entrada con precios,
   combos/snacks, códigos de descuento, política de reembolso…)? → **Arquetipo C** (§6).

4. **¿Es un panel para crear/editar/borrar** funciones, salas o películas
   (rol administrador)? → **Arquetipo D** (§7).

5. **¿Es gestionar la cuenta** (editar perfil, cambiar contraseña, borrar
   cuenta)? → **Arquetipo E** (§8).

6. **¿Es filtrar / ordenar / paginar** una lista que YA existe? → **Arquetipo F** (§9).

Si encaja en dos, combínalos (ej. "panel admin de un CRUD nuevo" = D + B).

---

## 3. Plantillas base (sirven para todos los arquetipos)

### 3a. Módulo de lógica — `js/modules/<feature>.js`

```js
// js/modules/<feature>.js
// <qué representa esta funcionalidad, y qué colección de db.json usa si aplica>

import { getAll, getById, create, update, remove } from "../services/api.service.js";
import { getCurrentUser } from "./auth.js";

/** Constantes de estado si el recurso tiene varios estados. */
export const <FEATURE>_STATUS = {
  ACTIVE: "active",
  DONE: "done",
};

/** Lee. Devuelve siempre un array/objeto ya ordenado y listo para pintar. */
export async function getUser<Feature>(userId) {
  const list = await getAll("<coleccion>", { userId });
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Crea. UNA sola escritura. */
export async function add<Feature>(data) {
  const user = getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");

  // validar aquí antes de escribir ...

  return create("<coleccion>", {
    id: `<pref>-${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    // ...campos del requerimiento...
    createdAt: new Date().toISOString(),
  });
}

/** Actualiza. UNA sola escritura (PATCH). */
export async function update<Feature>(id, partial) {
  return update("<coleccion>", id, partial);
}

/** Borra. UNA sola escritura. */
export async function remove<Feature>(id) {
  return remove("<coleccion>", id);
}
```

### 3b. Módulo de página — `js/modules/<pagina>.js`

```js
// js/modules/<pagina>.js · pages/<pagina>.html
// <qué muestra esta pantalla>

import "../components/site-header.js";
import "../components/site-footer.js";

import { isLoggedIn, requireAuth, getCurrentUser } from "./auth.js";
import { getUser<Feature> } from "./<feature>.js";
import { $ } from "../utils/dom.js";
import { setLoading, setEmpty, setError, setReady } from "../ui/states.js";

async function load() {
  const box = $("#<contenedor>");
  setLoading(box, "Cargando…");

  try {
    const items = await getUser<Feature>(getCurrentUser().id);
    if (items.length === 0) {
      setEmpty(box, "Todavía no hay nada aquí.");
      return;
    }
    box.replaceChildren(...items.map(renderItem));
    setReady(box);
  } catch {
    setError(box, "No se pudo cargar.", load);
  }
}

function renderItem(item) {
  const li = document.createElement("li");
  li.className = "<clase>";
  li.textContent = item.<campo>;
  return li;
}

// Si la página exige sesión:
if (!isLoggedIn()) requireAuth();
else load();
```

### 3c. Página HTML — `pages/<pagina>.html`

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="<descripción> · CINEHUB" />
    <title><Título> · CINEHUB</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="../css/variables.css?v=4" />
    <link rel="stylesheet" href="../css/main.css?v=4" />
    <link rel="stylesheet" href="../css/components.css?v=4" />
    <link rel="stylesheet" href="../css/listing.css?v=4" />
    <link rel="stylesheet" href="../css/responsive.css?v=4" />
  </head>
  <body>
    <a class="skip-link" href="#main">Saltar al contenido</a>

    <site-header active=""></site-header>

    <main id="main" class="listing-page">
      <div class="container listing-head">
        <h1 class="listing-title"><Título></h1>
      </div>

      <ul class="movie-grid container" id="<contenedor>" data-state="loading">
        <li class="state state--loading">Cargando…</li>
      </ul>
    </main>

    <site-footer></site-footer>

    <script type="module" src="../js/modules/<pagina>.js"></script>
  </body>
</html>
```

### 3d. Colección nueva en `db.json`

En `scripts/seed.js`, dentro del objeto `db` (al final del archivo), añade la
clave con un array vacío (o con ejemplos):

```js
const db = {
  users, rooms, seats, functions, functionSeats,
  reservations, purchases, favorites, ratings,
  <coleccion>: [],            // <-- nueva
};
```

Luego `npm run seed` regenera `db.json`. **Si no puedes reseedar** (perderías
datos), añade la clave a mano en `db.json`: `"<coleccion>": [],`.

### 3e. Enlace en el menú (si el requerimiento es una página nueva)

En `js/components/site-header.js`, array `NAV_ITEMS` (menú principal) o dentro de
`#renderAuthArea()` (menú de usuario, junto a "Mis reservas" / "Favoritos"):

```js
{ id: "<id>", label: "<Etiqueta>", href: "pages/<pagina>.html" }
```

---

## 4. Arquetipo A — Nueva vista de datos de TMDB (solo lectura)

**Ejemplos:** "mejor valoradas", "películas por año", "recomendadas", "similares
a esta", "colecciones/sagas", "reparto ampliado", "dónde ver (watch providers)".

### Archivos

| Archivo | Acción |
|---|---|
| `js/services/tmdb.service.js` | **Añadir** una función que pega al endpoint nuevo. |
| `js/modules/<feature>.js` **o** un módulo de página | La lógica de traer y pintar. |
| `pages/<pagina>.html` | Solo si es pantalla propia (si es una sección de la home o de una ficha, no). |
| `js/ui/render.js` | Reutilizar `createMovieCard` / `createTvCard`; crear tarjeta nueva solo si el diseño es distinto. |
| `js/components/site-header.js` | Enlace en el menú, si es página. |

### Esqueleto: función de servicio

```js
// en js/services/tmdb.service.js, junto a las demás

/** <qué devuelve>. Endpoint TMDB: <ruta>. */
export async function get<Cosa>(param, page = 1) {
  const data = await tmdbRequest("/<ruta>", { <param>: param, page });
  return data.results;            // listas: devolver el array
}
// para detalle (objeto entero) NO pongas async y devuelve tmdbRequest(...) directo
```

Endpoints útiles que quizá pidan (todos ya con el idioma puesto por `tmdbRequest`):

| Requerimiento probable | Endpoint |
|---|---|
| Mejor valoradas | `/movie/top_rated` · `/tv/top_rated` |
| Similares | `/movie/{id}/similar` |
| Recomendaciones | `/movie/{id}/recommendations` |
| Por año | `/discover/movie` con `primary_release_year` |
| Por año + género | `/discover/movie` con `with_genres` + `primary_release_year` |
| Colección/saga | `/collection/{id}` |
| Dónde ver | `/movie/{id}/watch/providers` |
| Palabra clave | `/discover/movie` con `with_keywords` |

### Esqueleto: módulo de página (patrón `category.js`)

```js
// js/modules/<pagina>.js · pages/<pagina>.html
import "../components/site-header.js";
import "../components/site-footer.js";

import { get<Cosa> } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setEmpty, setError, setReady } from "../ui/states.js";
import { createMovieCard } from "../ui/render.js";

async function load() {
  const grid = $("#results-grid");
  const param = new URLSearchParams(location.search).get("<param>");   // ej. ?year=2023

  setLoading(grid, "Cargando películas…");
  try {
    const movies = (await get<Cosa>(param)).filter((m) => m.poster_path);
    if (movies.length === 0) {
      setEmpty(grid, "No hay resultados.");
      return;
    }
    grid.replaceChildren(...movies.map((m) => createMovieCard(m)));
    setReady(grid);
  } catch {
    setError(grid, "No se pudo cargar.", load);
  }
}

load();
```

### Cómo adaptarlo

- Si es una **sección de la home**: no crees página. Escribe la función en
  `js/modules/<algo>.js` con un `export function init<Seccion>()`, añádele el
  `<section>` a `index.html` y llama a `init<Seccion>()` desde `js/main.js`
  (dentro del `Promise.allSettled`).
- Si es un **dato en la ficha** de película/serie: añade la llamada dentro de
  `js/modules/movie-details.js` / `tv-details.js` y píntalo en un bloque nuevo
  del HTML de esa ficha.

---

## 5. Arquetipo B — El usuario guarda algo suyo (colección en db.json)

**Ejemplos:** "ver más tarde / watchlist", "historial de vistas", "me interesa",
"notas privadas sobre una película", "valorar la sala tras la función",
"seguir a un actor", "lista de deseos de merchandising".

**Copia `favorites.js` + `my-favorites.js`. Son exactamente este patrón.**

### Archivos

| Archivo | Acción |
|---|---|
| `js/modules/<feature>.js` | **Nuevo.** CRUD de la colección (usa `api.service`). |
| `js/modules/my-<feature>.js` | **Nuevo.** Módulo de la página que lista lo guardado. |
| `pages/<feature>.html` | **Nueva.** Copia `pages/favorites.html`. |
| `js/ui/<feature>-button.js` | **Opcional.** Botón autogestionado (copia `favorite-button.js`). |
| `scripts/seed.js` | Añadir `<coleccion>: []` al objeto `db`. |
| `js/components/site-header.js` | Enlace en el menú de usuario. |

### Esqueleto: `js/modules/<feature>.js`

```js
// js/modules/<feature>.js
// <Qué es>. Colección `<coleccion>` en JSON Server:
//   { id, userId, mediaType: "movie" | "tv", tmdbId, title, posterPath, <extra>, createdAt }
//
// Cada acción es UNA escritura (POST / PATCH / DELETE) -> sin encadenar.

import { getAll, create, update, remove } from "../services/api.service.js";
import { getCurrentUser } from "./auth.js";

/** Lo que tiene guardado el usuario, recientes primero. */
export async function getUser<Feature>(userId) {
  const list = await getAll("<coleccion>", { userId });
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Busca el registro de este usuario para un título concreto (o null). */
export async function find<Feature>(userId, mediaType, tmdbId) {
  const list = await getAll("<coleccion>", { userId, mediaType, tmdbId });
  return list[0] ?? null;
}

/** Añade o quita (toggle). Devuelve true si quedó guardado, false si se quitó. */
export async function toggle<Feature>(media) {
  const user = getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");

  const existing = await find<Feature>(user.id, media.mediaType, media.tmdbId);
  if (existing) {
    await remove("<coleccion>", existing.id);
    return false;
  }

  await create("<coleccion>", {
    id: `<pref>-${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    mediaType: media.mediaType,
    tmdbId: media.tmdbId,
    title: media.title,
    posterPath: media.posterPath ?? null,
    // <campo extra del requerimiento: nota, puntuación de sala, estado...>
    createdAt: new Date().toISOString(),
  });
  return true;
}

/** Si el requerimiento permite editar el registro (ej. una nota). */
export async function edit<Feature>(id, partial) {
  return update("<coleccion>", id, partial);
}
```

### Esqueleto: `js/modules/my-<feature>.js` (copia de `my-favorites.js`)

```js
import "../components/site-header.js";
import "../components/site-footer.js";

import { isLoggedIn, requireAuth, getCurrentUser } from "./auth.js";
import { getUser<Feature> } from "./<feature>.js";
import { getMovieDetails, getTvDetails } from "../services/tmdb.service.js";
import { $ } from "../utils/dom.js";
import { setLoading, setError, setReady } from "../ui/states.js";
import { createMovieCard, createTvCard } from "../ui/render.js";
import { sitePath } from "../utils/helpers.js";

async function load() {
  const grid = $("#<feature>-grid");
  setLoading(grid, "Cargando…");
  try {
    const items = await getUser<Feature>(getCurrentUser().id);
    if (items.length === 0) {
      grid.dataset.state = "empty";
      grid.innerHTML = `<li class="state">Todavía no tienes nada.
        <a href="${sitePath("index.html")}">Ver la cartelera</a></li>`;
      return;
    }
    const cards = await Promise.all(items.map(toCard));
    grid.replaceChildren(...cards);
    setReady(grid);
  } catch {
    setError(grid, "No se pudo cargar.", load);
  }
}

async function toCard(item) {
  try {
    if (item.mediaType === "tv") return createTvCard(await getTvDetails(item.tmdbId));
    return createMovieCard(await getMovieDetails(item.tmdbId));
  } catch {
    const shaped = { id: item.tmdbId, title: item.title, name: item.title, poster_path: item.posterPath };
    return item.mediaType === "tv" ? createTvCard(shaped) : createMovieCard(shaped);
  }
}

if (!isLoggedIn()) requireAuth();
else load();
```

### Esqueleto: botón (opcional, copia de `favorite-button.js`)

```js
// js/ui/<feature>-button.js
import { toggle<Feature>, find<Feature> } from "../modules/<feature>.js";
import { getCurrentUser } from "../modules/auth.js";
import { sitePath } from "../utils/helpers.js";

export function create<Feature>Button(media) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "<feature>-btn";

  const user = getCurrentUser();
  if (!user) {
    btn.textContent = "<Etiqueta>";
    btn.addEventListener("click", () => {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = sitePath(`pages/login.html?next=${next}`);
    });
    return btn;
  }

  const paint = (on) => { btn.classList.toggle("is-active", on); btn.textContent = on ? "✓ Guardado" : "+ Guardar"; };

  find<Feature>(user.id, media.mediaType, media.tmdbId).then((r) => paint(Boolean(r)));

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try { paint(await toggle<Feature>(media)); }
    finally { btn.disabled = false; }
  });

  return btn;
}
```

Luego en `movie-details.js` / `tv-details.js`:
`actionsContainer.append(create<Feature>Button({ mediaType: "movie", tmdbId, title, posterPath }))`.

---

## 6. Arquetipo C — Cambiar el flujo de reserva / compra

**Ejemplos:** "tipos de entrada (adulto / niño / 3ª edad) con precios distintos",
"añadir combos de comida", "código de descuento", "elegir varias funciones a la
vez", "cambiar butacas de una reserva".

### Archivos

| Archivo | Acción |
|---|---|
| `js/modules/booking.js` | UI de selección + cálculo del total. La mayor parte del trabajo. |
| `js/modules/reservations.js` | Guardar los campos nuevos en el objeto reserva. |
| `js/modules/purchases.js` | Solo si el cambio afecta al pago / ticket. |
| `js/utils/helpers.js` | Función pura de cálculo de precio, si se complica. |
| `pages/booking.html` / `payment.html` | Los controles nuevos (selects, inputs). |
| `scripts/seed.js` | Datos nuevos en `functions` (ej. `prices: { adult, child }`) si aplica. |

### Regla clave

La reserva sigue siendo **UNA escritura**. Todo lo que el usuario elige
(cantidades por tipo, combos, descuento) se calcula en el navegador y se guarda
en el `create("reservations", {...})` de una vez.

### Esqueleto: cálculo puro en `helpers.js`

```js
// js/utils/helpers.js

/**
 * Total de una reserva con tipos de entrada y extras.
 * @param {{ adult:number, child:number, senior:number }} counts
 * @param {{ adult:number, child:number, senior:number }} prices  precio por tipo
 * @param {Array<{price:number, qty:number}>} addons  combos, etc.
 * @param {number} discountPct  0..100
 */
export function bookingTotal(counts, prices, addons = [], discountPct = 0) {
  const seats = Object.keys(counts).reduce((sum, k) => sum + counts[k] * prices[k], 0);
  const extras = addons.reduce((sum, a) => sum + a.price * a.qty, 0);
  const subtotal = seats + extras;
  return Math.round(subtotal * (1 - discountPct / 100));
}
```

### Esqueleto: campos nuevos en `reservations.js`

Dentro de `createReservation()`, en el objeto `reservation`, añade lo que pida el
requerimiento y recalcula `total` con la función de arriba:

```js
const reservation = {
  id: `res-${crypto.randomUUID().slice(0, 8)}`,
  userId: user.id,
  tmdbId: fn.tmdbId,
  functionId: fn.id,
  seatIds,
  seatCodes: selectedSeats.map((s) => s.seatCode).sort(),
  quantity: selectedSeats.length,

  // --- NUEVO segun el requerimiento ---
  ticketCounts: selected.counts,          // { adult: 2, child: 1 }
  addons: selected.addons,                // [{ name, price, qty }]
  discountCode: selected.code ?? null,
  // ------------------------------------

  pricePerTicket: fn.price,
  total: bookingTotal(selected.counts, fn.prices ?? { adult: fn.price }, selected.addons, selected.discountPct),
  status: RESERVATION_STATUS.RESERVED,
  createdAt: new Date().toISOString(),
};
```

`booking.js` es quien construye `selected` a partir de los `<select>`/`<input>`
del HTML y llama a `renderSummary()` cada vez que algo cambia. El resto del flujo
(validar butacas, crear, ir a `payment.html`) no cambia.

---

## 7. Arquetipo D — Panel de administración (CRUD)

**Ejemplos:** "crear/editar/eliminar funciones", "gestionar salas", "añadir una
película a la cartelera", "ver todas las reservas del cine".

### Archivos

| Archivo | Acción |
|---|---|
| `pages/admin.html` | **Nueva.** Formularios + tabla. |
| `js/modules/admin.js` | **Nuevo.** Módulo de la página. |
| `js/modules/auth.js` | Añadir `isAdmin()` y guardar `role` en la sesión. |
| `scripts/seed.js` | Un usuario con `role: "admin"`. |
| `js/components/site-header.js` | Enlace "Admin" solo si `isAdmin()`. |

Usa `api.service` **directamente** sobre `functions` / `rooms` (no hace falta un
módulo de lógica intermedio para un CRUD simple).

### Esqueleto: rol en `auth.js`

```js
// en startSession(): incluir el rol
function startSession(user) {
  const session = { id: user.id, name: user.name, email: user.email, role: user.role ?? "user" };
  writeJSON(SESSION_KEY, session);
  return session;
}

export function isAdmin() {
  const u = getCurrentUser();
  return u?.role === "admin";
}

/** Igual que requireAuth pero además exige rol admin. */
export function requireAdmin() {
  if (!requireAuth()) return false;
  if (!isAdmin()) { location.href = sitePath("index.html"); return false; }
  return true;
}
```

> ⚠️ Esto es seguridad **de mentira** (cualquiera puede editar `localStorage`).
> Para un proyecto académico con JSON Server es lo esperado; dilo así si preguntan.

### Esqueleto: `js/modules/admin.js`

```js
// js/modules/admin.js · pages/admin.html
import "../components/site-header.js";
import "../components/site-footer.js";

import { requireAdmin } from "./auth.js";
import { getAll, create, update, remove } from "../services/api.service.js";
import { $, $$ } from "../utils/dom.js";
import { setLoading, setError, setReady } from "../ui/states.js";

const RESOURCE = "functions";   // o "rooms"

async function refresh() {
  const tbody = $("#rows");
  setLoading(tbody, "Cargando…");
  try {
    const rows = await getAll(RESOURCE);
    tbody.replaceChildren(...rows.map(renderRow));
    setReady(tbody);
  } catch {
    setError(tbody, "No se pudo cargar.", refresh);
  }
}

function renderRow(item) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${item.movieTitle ?? item.name}</td>
    <td>${item.date ?? ""} ${item.time ?? ""}</td>
    <td>
      <button data-edit="${item.id}">Editar</button>
      <button data-del="${item.id}">Eliminar</button>
    </td>`;
  return tr;
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));   // { movieTitle, date, time, roomId, price }
  const id = form.dataset.editing;

  try {
    if (id) {
      await update(RESOURCE, id, data);                  // PATCH
    } else {
      await create(RESOURCE, {                           // POST
        id: `fn-${crypto.randomUUID().slice(0, 8)}`,
        ...data,
        price: Number(data.price),
      });
    }
    form.reset();
    delete form.dataset.editing;
    refresh();
  } catch {
    alert("No se pudo guardar.");
  }
}

async function onTableClick(event) {
  const del = event.target.dataset.del;
  const edit = event.target.dataset.edit;
  if (del && confirm("¿Eliminar?")) { await remove(RESOURCE, del); refresh(); }
  if (edit) {
    const item = await getAll(RESOURCE).then((r) => r.find((x) => x.id === edit));
    const form = $("#form");
    for (const [k, v] of Object.entries(item)) {
      if (form.elements[k]) form.elements[k].value = v;
    }
    form.dataset.editing = edit;
  }
}

if (requireAdmin()) {
  $("#form").addEventListener("submit", onSubmit);
  $("#rows").addEventListener("click", onTableClick);
  refresh();
}
```

Cada botón hace **una** operación (crear, o editar, o borrar) y luego un
`refresh()`. Nunca encadenar dos escrituras seguidas.

---

## 8. Arquetipo E — Gestión de cuenta

**Ejemplos:** "editar perfil", "cambiar contraseña", "eliminar cuenta".

### Archivos

| Archivo | Acción |
|---|---|
| `js/modules/auth.js` | Añadir `updateProfile()`, `changePassword()`, `deleteAccount()`. |
| `pages/profile.html` + `js/modules/profile.js` | La pantalla. |
| `js/components/site-header.js` | Enlace "Mi perfil" en el menú de usuario. |

### Esqueleto: en `auth.js`

```js
import { getAll, create, update, remove } from "../services/api.service.js";

/** Actualiza nombre / correo y refresca la sesión. UNA escritura. */
export async function updateProfile({ name, email }) {
  const current = getCurrentUser();
  if (!current) throw new Error("No hay sesión.");

  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) throw new Error("Correo no válido.");

  // correo único (ignorando el tuyo)
  const taken = (await getAll("users", { email: cleanEmail })).filter((u) => u.id !== current.id);
  if (taken.length > 0) throw new Error("Ese correo ya está en uso.");

  const updated = await update("users", current.id, { name: name.trim(), email: cleanEmail });
  return startSession(updated);          // refresca localStorage
}

/** Cambia la contraseña comprobando la actual. */
export async function changePassword({ currentPassword, newPassword }) {
  const session = getCurrentUser();
  const user = await getById("users", session.id);   // importa getById arriba
  if (user.password !== currentPassword) throw new Error("La contraseña actual no coincide.");
  if (newPassword.length < 6) throw new Error("Mínimo 6 caracteres.");
  return update("users", session.id, { password: newPassword });
}

/** Borra la cuenta y cierra sesión. */
export async function deleteAccount() {
  const session = getCurrentUser();
  await remove("users", session.id);
  logout();
}
```

### Esqueleto: `js/modules/profile.js`

```js
import "../components/site-header.js";
import "../components/site-footer.js";

import { isLoggedIn, requireAuth, getCurrentUser, updateProfile } from "./auth.js";
import { $ } from "../utils/dom.js";

function fill() {
  const u = getCurrentUser();
  $("#name").value = u.name;
  $("#email").value = u.email;
}

async function onSubmit(event) {
  event.preventDefault();
  const msg = $("#msg");
  try {
    await updateProfile({ name: $("#name").value, email: $("#email").value });
    msg.textContent = "Guardado.";
  } catch (err) {
    msg.textContent = err.message;
  }
}

if (!isLoggedIn()) requireAuth();
else { fill(); $("#form").addEventListener("submit", onSubmit); }
```

---

## 9. Arquetipo F — Filtrar / ordenar / paginar una lista existente

**Ejemplos:** "ordena la cartelera por fecha", "filtra series por género",
"añade un buscador a favoritos", "paginación en resultados".

**No creas archivos.** Editas el módulo de la página que ya lista esos datos
(`search.js`, `category.js`, `movies-page.js`, `series-page.js`, `my-favorites.js`…).

### Patrón

1. Añade los controles al HTML de esa página:
   ```html
   <select id="sort">
     <option value="date">Fecha</option>
     <option value="rating">Valoración</option>
   </select>
   <input id="filter" type="search" placeholder="Filtrar…" />
   ```
2. En el módulo, guarda la lista completa una vez y re-pinta al cambiar un control:
   ```js
   import { debounce } from "../utils/helpers.js";

   let allItems = [];   // lo que vino de la API, sin tocar

   function apply() {
     const term = $("#filter").value.trim().toLowerCase();
     const sort = $("#sort").value;

     let view = allItems.filter((m) => (m.title ?? m.name).toLowerCase().includes(term));

     view.sort((a, b) => {
       if (sort === "rating") return b.vote_average - a.vote_average;
       return (b.release_date ?? "").localeCompare(a.release_date ?? "");
     });

     grid.replaceChildren(...view.map((m) => createMovieCard(m)));
   }

   $("#sort").addEventListener("change", apply);
   $("#filter").addEventListener("input", debounce(apply, 250));
   ```
3. El estado se puede reflejar en la URL con `history.replaceState` (como hace
   `category.js` con `?genre=`) para que sea compartible — opcional.

Para **paginación real de TMDB**: tus funciones de servicio ya aceptan `page`.
Guarda `let page = 1`, un botón "Cargar más" hace `page++`, llama otra vez y
**añade** (`grid.append(...)`) en vez de reemplazar.

---

## 10. Checklist antes de dar por hecho el requerimiento

```
[ ] La lógica está en modules/, el fetch solo en services/.
[ ] Cada operación de escritura va sola (nunca POST seguido de PATCH sin await + sin necesidad real).
[ ] Estados loading / empty / error / ready puestos con ui/states.js.
[ ] IDs con el formato `<pref>-${crypto.randomUUID().slice(0,8)}`.
[ ] Fechas con new Date().toISOString().
[ ] Página nueva: <link> CSS con ?v=4 · <site-header> y <site-footer> · <script type="module">.
[ ] Colección nueva: añadida a scripts/seed.js y a db.json.
[ ] Enlace en el menú (site-header.js) si procede.
[ ] Página que necesita sesión: requireAuth() al final del módulo.
[ ] npm run check  ->  sin errores de sintaxis.
[ ] Probado el flujo entero en el navegador con F12 abierto.
```

### Flujo git (lo exige el profesor)

```powershell
git checkout develop
git pull
git checkout -b feat/<nombre-del-requerimiento>

# ...implementar...

git add <archivos>
git commit -m ":sparkles: feat(<nombre>): <descripción corta>"
git push -u origin feat/<nombre-del-requerimiento>

# En GitHub: Pull Request  feat/<nombre>  ->  develop
```

Un `feat/*` y un PR **por requerimiento**. No mezcles dos funcionalidades en la
misma rama.

---

## 11. Resumen: dónde vive cada cosa

| Necesitas… | Archivo |
|---|---|
| Pedir datos a TMDB | `js/services/tmdb.service.js` (añadir función) |
| Leer/escribir en db.json | `js/services/api.service.js` (ya es genérico, no se toca) |
| Lógica de una funcionalidad | `js/modules/<feature>.js` (nuevo) |
| Una pantalla nueva | `pages/<x>.html` + `js/modules/<x>.js` (nuevos) |
| Convertir datos en tarjetas | `js/ui/render.js` |
| Loading / error / vacío | `js/ui/states.js` |
| Formatear fechas, dinero, texto | `js/utils/helpers.js` |
| Sesión / login / permisos | `js/modules/auth.js` |
| Menú y navegación | `js/components/site-header.js` |
| Datos de arranque | `scripts/seed.js` → `npm run seed` |
```
