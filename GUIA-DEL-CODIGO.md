# CINEHUB · Guía del código

Explicación de **qué hace cada archivo JavaScript** y su lógica importante.
Los `.css` y `.html` se omiten salvo detalles clave.

> **Regla de oro del proyecto:** ningún archivo hace `fetch` fuera de `js/services/`.
> Todo pasa por `tmdb.service.js` (TMDB) o `api.service.js` (JSON Server).

Índice:
1. [Punto de entrada](#1-punto-de-entrada--jsmainjs)
2. [Configuración](#2-configuración--jsconfigjs)
3. [Servicios (acceso a datos)](#3-servicios--jsservices)
4. [Utilidades](#4-utilidades--jsutils)
5. [Capa de UI](#5-capa-de-ui--jsui)
6. [Web Components](#6-web-components--jscomponents)
7. [GSAP](#7-gsap--jslibgsapjs)
8. [Módulos de lógica](#8-módulos-de-lógica--jsmodules)
9. [Scripts](#9-scripts--scripts)

---

## 1. Punto de entrada · `js/main.js`

Es el script que carga `index.html`. Orquesta la portada.

```js
import "./components/site-header.js";   // registra <site-header>
import "./components/site-footer.js";   // registra <site-footer>
import "./components/app-modal.js";     // registra <app-modal>
```
Estos `import` sin `{}` solo **ejecutan** el archivo (que llama a `customElements.define`).
A partir de ahí el navegador entiende esas etiquetas.

```js
initQuickBooking();   // Quick Booking (solo depende de JSON Server)
initPopular();         // "Popular at CINEHUB" (reservas + póster de TMDB)
```
Se llaman fuera de `bootHome()` porque no necesitan la tabla de géneros.

```js
async function bootHome() {
  let genreMap = new Map();
  try {
    const genres = await getGenres();
    genreMap = new Map(genres.map((g) => [g.id, g.name]));  // { 28 => "Acción", ... }
  } catch { /* los nombres de género son decorativos */ }

  initHero().finally(animateHero);   // rellena el hero y, cuando acaba, lo anima
  initTrailers();
  initSurprise();

  await Promise.allSettled([          // esperamos a que las secciones tengan tarjetas...
    initNowShowing(genreMap),
    initTrending(genreMap),
    initComingSoon(genreMap),
    initPopularSeries(),
  ]);
  animateSectionOnScroll("#now-showing");   // ...y las animamos al hacer scroll
  animateSectionOnScroll("#trending");
  animateSectionOnScroll("#popular-series");
  animateSectionOnScroll("#coming-soon");
}
bootHome();
```
- `genreMap`: las listas de TMDB traen `genre_ids: [28, 12]` (números). Este `Map` los
  traduce a nombres. Se pide **una vez** y se pasa a cada sección.
- `Promise.allSettled`: espera a que todas terminen (aunque alguna falle) antes de animar.
- Cada `init*` maneja su propio error → si TMDB falla en una sección, las demás siguen.

---

## 2. Configuración · `js/config.js`

Constantes en un solo sitio. **No se sube al repo** (contiene el token). Se crea copiando
`js/config.example.js`.

```js
export const API_BASE_URL = "http://localhost:3000";        // JSON Server
export const TMDB_TOKEN = "eyJ...";                          // token v4 de TMDB
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p";  // + /w500/archivo.jpg
export const TMDB_LANG = "es-ES";
export const FEATURED_MOVIE_ID = 558449;   // película del Hero (Gladiator II)
export const DEFAULT_TICKET_PRICE = 18000;
```

---

## 3. Servicios · `js/services/`

### `tmdb.service.js` — único acceso a TMDB

```js
async function tmdbRequest(path, params = {}) {
  if (!TMDB_TOKEN) throw new Error("Falta el token de TMDB…");

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("language", TMDB_LANG);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, value);   // añade ?page=1&query=… ignorando vacíos
    }
  }

  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: "application/json" },
    });
  } catch {
    throw new Error("No se pudo conectar con TMDB…");   // sin red / CORS
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error("Token de TMDB inválido (401)…");
    throw new Error(`TMDB respondió ${response.status}…`);
  }
  return response.json();
}
```
Envoltorio central: pone la cabecera del token, el idioma, y traduce errores a mensajes
claros. **Todas** las demás funciones lo usan.

Funciones (todas devuelven el array `results` o el objeto, según el endpoint):

| Función | Endpoint TMDB | Para qué |
|---|---|---|
| `getNowPlaying()` | `/movie/now_playing` | (ya no se usa en la home; queda por si acaso) |
| `getTrending()` | `/trending/movie/week` | Trending Now |
| `getUpcoming()` | `/movie/upcoming` | Coming Soon |
| `searchMovies(q)` | `/search/movie` | búsqueda (si `q` vacío → `[]`, sin llamar) |
| `getMoviesByGenre(id)` | `/discover/movie` | página de categorías |
| `getMovieDetails(id)` | `/movie/{id}` | ficha (incluye `genres`, `runtime`, `overview`) |
| `getMovieCredits(id)` | `/movie/{id}/credits` | reparto + equipo (director) |
| `getMovieVideos(id)` | `/movie/{id}/videos` | trailers. Pide en español; si vacío, reintenta en inglés |
| `getGenres()` | `/genre/movie/list` | tabla id→nombre de géneros de cine |
| `getPopularTv()` `getTrendingTv()` `getOnAirTv()` | `/tv/…` | catálogo de series |
| `searchTv(q)` `getTvByGenre(id)` | `/search/tv` `/discover/tv` | |
| `getTvDetails(id)` | `/tv/{id}` | ficha de serie (`number_of_seasons`, `created_by`…) |
| `getTvCredits(id)` | `/tv/{id}/aggregate_credits` | reparto de serie (el personaje va en `roles[0].character`) |
| `getTvVideos(id)` `getTvGenres()` | `/tv/…` | |
| `getPersonDetails(id)` | `/person/{id}` | ficha de actor (bio, nacimiento) |
| `getPersonMovieCredits(id)` | `/person/{id}/movie_credits` | sus películas (`cast[]`) |

```js
export function imageUrl(path, size = "w500") {
  if (!path) return "";                       // sin imagen → el que llama usa un placeholder
  return `${TMDB_IMAGE_URL}/${size}${path}`;   // https://image.tmdb.org/t/p/w500/abc.jpg
}
```

### `api.service.js` — único acceso a JSON Server

```js
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  let response;
  try {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor de CINEHUB. ¿Ejecutaste 'npm start'?");
  }
  if (!response.ok) throw new Error(`Error ${response.status} en ${options.method ?? "GET"} ${path}`);
  if (response.status === 204) return null;   // No Content (algunos DELETE)
  return response.json();
}

function toQueryString(query) {   // { userId: "u1", email: "" } -> "?userId=u1"
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== null && v !== undefined && v !== "") params.append(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
```

| Función | HTTP | Ejemplo |
|---|---|---|
| `getAll(resource, query?)` | GET | `getAll("functions", { date: "2026-08-28" })` |
| `getById(resource, id)` | GET | `getById("rooms", "room-1")` |
| `create(resource, data)` | POST | `create("reservations", {...})` |
| `update(resource, id, partial)` | PATCH | `update("reservations", id, { status: "paid" })` |
| `replace(resource, id, data)` | PUT | (no se usa) |
| `remove(resource, id)` | DELETE | `remove("favorites", id)` |

JSON Server traduce cada método HTTP a una operación sobre el array de `db.json` y
**reescribe el archivo** en cada escritura.

---

## 4. Utilidades · `js/utils/`

### `dom.js`
```js
export const $  = (sel, parent = document) => parent.querySelector(sel);       // 1 elemento
export const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)]; // array (no NodeList)

export function cloneTemplate(id) {   // clona un <template id="…"> por su id
  const tpl = document.getElementById(id);
  if (!(tpl instanceof HTMLTemplateElement)) throw new Error(`Template #${id} no encontrado`);
  return tpl.content.firstElementChild.cloneNode(true);
}
```

### `helpers.js` — funciones puras (sin DOM, sin fetch)
| Función | Qué hace |
|---|---|
| `sleep(ms)` | `Promise` que se resuelve tras `ms` (para espaciar peticiones) |
| `formatRuntime(154)` | `"2h 34m"` |
| `formatYear("2024-02-27")` | `"2024"` |
| `formatRating(7.84)` | `"★ 7.8"` |
| `formatReleaseDate("2024-12-15")` | `"15 dic 2024"` |
| `dateOptionLabel(iso)` | `"Hoy · vie, 28 ago"` / `"Mañana · …"` / `"dom, 30 ago"` |
| `formatMoney(18000)` | `"$ 18.000"` (pesos, sin decimales) |
| `genreNames(item, genreMap)` | nombres de género: usa `item.genres` (ficha) o `item.genre_ids` + `genreMap` (listas) |
| `pickTrailer(videos)` | mejor vídeo: Trailer oficial de YouTube > Trailer > Teaser > el primero |
| `debounce(fn, 350)` | versión de `fn` que espera 350 ms de "silencio" |
| `sitePath(path)` | `"pages/x.html"` desde `/`, `"../pages/x.html"` desde `/pages/` |
| `POSTER_PLACEHOLDER` | data-URI de un SVG gris "Sin imagen" |

### `storage.js` — envoltorio de `localStorage`
```js
export function readJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { return null; }   // modo privado / cuota llena / bloqueado
}
export function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
export function removeKey(key) { try { localStorage.removeItem(key); } catch {} }
```

### `fake-qr.js`
```js
export function fakeQrSvg(text, modules = 25) { … }
```
Genera un SVG que **parece** un QR (los 3 "ojos" de las esquinas + módulos on/off).
Es **determinista** (mismo texto → mismo dibujo) usando un hash `djb2` como semilla de un
PRNG `mulberry32`. **No es escaneable** — es decorativo para el ticket.

---

## 5. Capa de UI · `js/ui/`

### `states.js` — estados de carga reutilizables
```js
export function setLoading(container, message) { container.dataset.state = "loading"; … }
export function setEmpty(container, message)   { container.dataset.state = "empty";   … }
export function setError(container, message, onRetry) {   // añade botón "Try again" si hay onRetry
  container.dataset.state = "error"; …
}
export function setReady(container) { container.dataset.state = "ready"; }
```
`makeStateEl` detecta si el contenedor es `<ul>/<ol>` (crea `<li>`) o no (`<p>`), para no
generar HTML inválido.

### `render.js` — construye tarjetas del DOM a partir de datos de TMDB
```js
function buildPosterCard({ href, title, metaText, rating, posterPath, badge }) { … }
```
Helper interno: crea el `<article class="movie-card">` con póster, título, meta y rating.

```js
export function createMovieCard(movie, { genreMap, badge } = {}) {   // usa buildPosterCard
  // title = movie.title ?? movie.name ; enlaza a movie.html?id=
}
export function createTvCard(show, { genreMap, badge } = {}) {         // usa buildPosterCard
  // title = show.name ; meta = géneros o first_air_date ; enlaza a tv.html?id=
}
export function createTrendingItem(movie, rank, genreMap) { … }        // con número #rank (clona tpl-trending-item)
export function createTrailerThumb(video) { … }                       // miniatura de trailer (img de i.ytimg.com)
export function createCastCard(person) {
  // <a href="person.html?id="> con foto, nombre y personaje
  // el personaje está en person.character (película) o person.roles[0].character (serie)
}
```

### `reviews.js` — sección de reseñas reutilizable
```js
export async function mountReviews(container, { mediaType, tmdbId }) { … }
```
Pinta dentro de `container`:
- resumen: `★ media · N reseñas`
- formulario (si hay sesión): `.star-input` de 5 estrellas con **preview al pasar el ratón** +
  textarea. Si el usuario ya tenía reseña, viene precargada y aparece "Eliminar".
- lista de todas las reseñas (la propia marcada con `.review--mine`).

`renderForm` guarda el `score` en una variable y `paint(value)` pinta las estrellas
encendidas hasta `value`. Al enviar llama a `saveRating` y luego **vuelve a montar** toda
la sección (`mountReviews(...)`) para refrescar media y lista.

### `favorite-button.js`
```js
export function createFavoriteButton(media) {
  // botón ♥ que gestiona su propio estado
  // 1. si hay sesión, consulta findFavorite() y pinta si ya es favorito
  // 2. al pulsar: sin sesión -> va a login?next= ; con sesión -> toggleFavorite()
}
```

---

## 6. Web Components · `js/components/`

### `site-header.js` — `<site-header active="movies">` (light DOM)
Web Component **sin Shadow DOM** (`this.innerHTML = …`), para que el CSS global aplique y
`document.getElementById` funcione. En `connectedCallback`:
- Pinta el header con el logo, el nav (`NAV_ITEMS`), la búsqueda y la zona de cuenta.
- `#renderAuthArea()`: si `getCurrentUser()` devuelve algo → menú de usuario (nombre + dropdown
  con My Reservations / My Tickets / Favoritos / Cerrar sesión); si no → botón "Login".
- `#wireSearch()`: abre/cierra la barra de búsqueda y al enviar navega a `search.html?q=`.
- `#wireUserMenu()`: abre/cierra el dropdown; el logout borra la sesión y va al inicio.
- `#wireNavToggle()`: en móvil (`<900px`) el nav se colapsa; el botón ☰ le pone la clase `.is-open`.
- `#guessActive()`: si no se pasó `active=""`, lo deduce de la URL.

### `site-footer.js` — `<site-footer>` (light DOM)
Igual de simple: pinta el footer con enlaces usando `sitePath()` para que funcionen desde
cualquier carpeta.

### `app-modal.js` — `<app-modal>` (Shadow DOM)
```js
class AppModal extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); … }
  connectedCallback() { this.shadowRoot.innerHTML = `<style>…</style><div class="backdrop">…`; … }
  setContent(node) { this.replaceChildren(node); }   // mete contenido en el "light DOM"
  open()  { this.setAttribute("open", ""); document.body.style.overflow = "hidden"; …gsap fade+scale }
  close() { …gsap encoge y en onComplete llama a #finishClose() }
  #finishClose() { this.removeAttribute("open"); this.replaceChildren(); … }  // vaciar detiene el <iframe>
}
customElements.define("app-modal", AppModal);
```
Estilos **encapsulados** en el Shadow DOM. Al cerrar hace `replaceChildren()` → el `<iframe>`
del trailer se elimina y el vídeo se detiene. Cierra con ✕, clic fuera o `Esc`.

### `cinema-seat.js` — `<cinema-seat>` (Shadow DOM) — **el más importante**
```js
class CinemaSeat extends HTMLElement {
  static get observedAttributes() { return ["status", "seat-code", "recommended"]; }
  seatId = null;   // dato que asigna el padre (no es atributo: es una referencia)

  constructor() {
    super();
    this.attachShadow({ mode: "open" }).append(template.content.cloneNode(true));
    this._button = this.shadowRoot.querySelector("button");
  }
  connectedCallback() {
    if (!this.hasAttribute("status")) this.setAttribute("status", "available");
    this._button.addEventListener("click", () => this._handleClick());
    this._render();
  }
  attributeChangedCallback() { if (this.isConnected) this._render(); }  // re-pinta al cambiar status

  _handleClick() {
    if (this.status === "available")      this.setAttribute("status", "selected");
    else if (this.status === "selected")  this.setAttribute("status", "available");
    else return;                          // reserved / sold: no seleccionable

    this.dispatchEvent(new CustomEvent("seat-toggle", {
      bubbles: true,
      composed: true,                     // deja salir el evento del Shadow DOM
      detail: { seatId: this.seatId, seatCode: …, location: …, selected: this.selected },
    }));
  }
  _render() {
    this._button.textContent = this.getAttribute("seat-code");
    this._button.disabled = !SELECTABLE.has(this.status);   // reserved/sold -> disabled
    this._button.setAttribute("aria-pressed", String(this.status === "selected"));
    this._button.setAttribute("aria-label", `Butaca ${code}, ${STATUS_LABEL[status]}`);
  }
}
```
- Los colores (verde/naranja/ámbar/gris) se definen en el `<style>` del Shadow DOM con
  selectores `:host([status="…"])`. Usa `var(--color-*)` porque **las variables CSS sí
  atraviesan el Shadow DOM**.
- El padre (`booking.js`) escucha `seat-toggle` para mantener el array de seleccionadas.

---

## 7. GSAP · `js/lib/gsap.js`
```js
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const gsap = prefersReducedMotion ? null : window.gsap ?? null;
export const ScrollTrigger = window.ScrollTrigger ?? null;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
export const canAnimate = Boolean(gsap);
```
GSAP se carga como **global** (`<script src="assets/vendor/gsap.min.js">`). Este módulo lo
reexpone para poder `import`arlo. Si no está cargado **o** el usuario pidió menos movimiento,
`gsap = null` y cada animación comprueba `canAnimate` y no hace nada.

`js/modules/animations.js`:
- `animateHero()`: timeline — el backdrop hace zoom + el título/meta/botones entran en cascada.
- `animateOnScroll(sel, itemSel)`: aparición escalonada de tarjetas (para rejillas normales).
- `animateSectionOnScroll(sel)`: fade+subida de una sección entera (para las filas scroll-snap).

---

## 8. Módulos de lógica · `js/modules/`

### 8.1 Núcleo compartido

#### `auth.js` — autenticación simulada
```js
const SESSION_KEY = "cinehub_user";
export function getCurrentUser() { return readJSON(SESSION_KEY); }  // { id, name, email } | null
export function isLoggedIn()     { return getCurrentUser() !== null; }

export async function login({ email, password }) {
  const users = await getAll("users", { email: email.trim().toLowerCase() });
  const user = users[0];
  if (!user || user.password !== password) throw new Error("Correo o contraseña incorrectos.");
  return startSession(user);   // guarda { id, name, email } en localStorage — SIN password
}

export async function register({ name, email, password }) {
  // valida nombre/email/password, comprueba que el email no exista,
  // POST /users con id "user-<uuid8>", inicia sesión
}

export function logout() { removeKey(SESSION_KEY); }

export function requireAuth() {   // al principio de páginas que exigen sesión
  if (isLoggedIn()) return true;
  location.href = sitePath(`pages/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
  return false;
}
```
La comprobación de contraseña es **en el cliente**. En `localStorage` nunca va la contraseña.

#### `seats.js` — disponibilidad de butacas (DERIVADA)
```js
export const SEAT_STATUS = { AVAILABLE: "available", RESERVED: "reserved", SOLD: "sold" };

export async function getTakenSeats(functionId) {
  const [reservations, purchases] = await Promise.all([
    getAll("reservations", { functionId }),
    getAll("purchases", { functionId }),
  ]);
  const sold = new Set(purchases.flatMap((p) => p.seatIds ?? []));
  const reserved = new Set(
    reservations.filter((r) => r.status === "reserved").flatMap((r) => r.seatIds ?? [])
  );
  for (const id of sold) reserved.delete(id);   // si está vendida y reservada, gana "vendida"
  return { sold, reserved };
}

export async function getFunctionContext(functionId) {
  const fn = await getById("functions", functionId);
  const [room, seats, taken] = await Promise.all([
    getById("rooms", fn.roomId),
    getAll("seats", { roomId: fn.roomId }),
    getTakenSeats(functionId),
  ]);
  const statusOf = (seatId) =>
    taken.sold.has(seatId) ? "sold" : taken.reserved.has(seatId) ? "reserved" : "available";
  return { fn, room, rows: groupByRow(seats, statusOf) };   // rows = [{ row:"A", seats:[{…, status}] }]
}

export async function checkSeatsAvailable(functionId, seatIds) {   // RF-15: re-chequeo antes de confirmar
  const taken = await getTakenSeats(functionId);
  const unavailable = seatIds.filter((id) => taken.sold.has(id) || taken.reserved.has(id));
  return { ok: unavailable.length === 0, unavailable };
}
```
**Clave del proyecto:** el estado de una butaca NO se guarda; se **calcula** mirando si
aparece en un `purchase` (vendida) o en una `reservation` activa (reservada). Así reservar
es 1 sola escritura.

#### `reservations.js`
```js
export async function createReservation({ ctx, selectedSeats }) {
  // 1. RF-15: checkSeatsAvailable — si alguna ocupada, error
  // 2. UNA escritura: POST /reservations
  //    { userId, tmdbId, movieTitle, functionId, roomId, roomName, date, time, format,
  //      seatIds, seatCodes, quantity, pricePerTicket, total, status: "reserved", createdAt }
}
export async function getUserReservations(userId) {   // ordenadas de más reciente a más antigua
  return (await getAll("reservations", { userId })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function cancelReservation(reservationId) {
  // comprueba que no esté cancelada y que NO tenga compra
  // UNA escritura: PATCH status -> "cancelled"  (las butacas quedan libres al derivar)
}
```

#### `purchases.js`
```js
export async function payReservation(reservationId) {
  // verifica dueño y estado; si ya hay compra -> la devuelve (idempotente)
  // RF-13: comprueba que las butacas no las haya comprado OTRO
  // 1. UNA escritura bloqueante: POST /purchases
  //    { ticketId: "CH-2026-XXXXXX", reservationId, seatIds, seatCodes, quantity, total, purchasedAt }
  // 2. marca la reserva "paid" EN SEGUNDO PLANO (sin await) -> si json-server se atasca, da igual
  //    (el estado "pagada" también se deriva de que exista la compra)
}
export async function getUserPurchases(userId) { … }
export async function getPurchaseByReservation(reservationId) { … }
```

#### `ratings.js`
```js
export async function getRatingsFor(mediaType, tmdbId) { … }   // GET /ratings?mediaType=…&tmdbId=…
export async function getUserRating(userId, mediaType, tmdbId) { … }
export function averageRating(ratings) { return { avg, count }; }

export async function saveRating({ mediaType, tmdbId, score, comment }) {
  // valida score 1..5
  // upsert: si el usuario ya tiene reseña de este título -> PATCH ; si no -> POST
  //   { userId, userName (denormalizado), mediaType, tmdbId, score, comment, createdAt }
}
export async function deleteRating(ratingId) { /* comprueba userId, DELETE */ }
```

#### `favorites.js`
```js
export async function getUserFavorites(userId) { … }
export async function findFavorite(userId, mediaType, tmdbId) { … }
export async function toggleFavorite(media) {
  // ¿existe? -> DELETE (return false) ; ¿no? -> POST (return true)
  //   { userId, mediaType, tmdbId, title, posterPath, addedAt }
}
```

### 8.2 Secciones de la Homepage

| Módulo | Qué hace |
|---|---|
| `hero.js` | `initHero()`: pide `getMovieDetails(FEATURED_MOVIE_ID)` (si falla, la 1ª de "now playing") y rellena `[data-hero-*]`. El botón "Watch Trailer" llama a `playMovieTrailer()`. |
| `movies.js` | `initNowShowing()`: **NO** usa TMDB directamente — pide `GET /functions`, saca los `tmdbId` únicos y trae la ficha de cada uno → así toda tarjeta es reservable. `initTrending()`: `getTrending()` con ranking. `initComingSoon()`: `getUpcoming()`, prefiere fecha futura y si no hay, muestra la lista tal cual. |
| `trailers.js` | `initTrailers()`: coge 4 pelis de "now playing", busca el mejor trailer de cada una, pinta el destacado + 3 miniaturas. `playTrailer(key)`: mete un `<iframe>` de YouTube en el `<app-modal>`. `playMovieTrailer(id)`: busca el trailer de una peli y lo reproduce (lo usa el Hero). |
| `surprise.js` | `initSurprise()`: al pulsar "Surprise me", `spin()` cambia el póster 20 veces con `setTimeout` de retardo creciente (efecto de frenado), y `showFinal()` revela la película elegida con un "pop" de GSAP. |
| `quick-booking.js` | `initQuickBooking()`: carga `functions` + `rooms` **una vez**. Rellena los `<select>`. Al cambiar película recalcula fechas válidas; al cambiar fecha recalcula horas (`setOptions` reconstruye el `<select>` conservando placeholder y selección). Al enviar, `matchFunctions()` filtra y muestra las coincidencias con enlace a `booking.html?functionId=`. |
| `popular.js` | `initPopular()`: `GET /reservations`, agrupa por `tmdbId` sumando `quantity` (ignora canceladas), ordena, top 3, y pide el póster de cada uno a TMDB. Etiquetas "Most Booked / Trending Locally / Fan Favorite". |
| `series-home.js` | `initPopularSeries()`: `getPopularTv()` → fila de tarjetas de serie. |

### 8.3 Páginas (cada `.html` de `pages/` carga su módulo)

| Módulo | Página | Qué hace |
|---|---|---|
| `login.js` / `register.js` | login/register | Si ya hay sesión, redirige al inicio. Al enviar el form llama a `login()`/`register()`; en éxito va a `?next=` o al inicio; en error muestra el mensaje. `register.js` comprueba que las contraseñas coincidan. |
| `movie-details.js` | movie.html | Lee `?id=`. `Promise.all` de `getMovieDetails` + `getMovieCredits` + `getMovieVideos` + `getAll("functions",{tmdbId})` + `getAll("rooms")`. Pinta hero, reparto (`createCastCard`), **Showtimes** (`renderShowtimes` agrupa las funciones por fecha, cada hora enlaza a `booking.html?functionId=`), botón ♥ (`createFavoriteButton`) y **Reseñas** (`mountReviews`). |
| `tv-details.js` | tv.html | Igual pero para series: sin showtimes ni "Buy Tickets", con `number_of_seasons` y `created_by`. |
| `person.js` | person.html | Lee `?id=`. `getPersonDetails` + `getPersonMovieCredits`. Pinta foto/bio/datos y **una rejilla con sus películas**: `credits.cast` sin duplicados (por id), solo con póster, ordenadas por `popularity` desc, top 24, cada una `createMovieCard` → `movie.html`. |
| `movies-page.js` | movies.html | Pestañas En cartelera / Tendencia / Próximamente. Cada pestaña llama a su `fetch` y pinta la rejilla; `pages()` junta 2 páginas del endpoint. |
| `series-page.js` | series.html | Igual, pestañas Populares / Tendencia / En emisión (series). |
| `category.js` | category.html | Lee `?genre=`. Pinta los chips de todos los géneros; al hacer clic cambia de género **sin recargar** (`history.replaceState`) y vuelve a pedir `getMoviesByGenre`. |
| `search.js` | search.html | Lee `?q=`. `searchMovies(q)` → rejilla. Tiene su propio buscador que actualiza `?q=` sin recargar. |
| `booking.js` | booking.html | **La página más compleja.** Ver abajo. |
| `payment.js` | payment.html | Lee `?reservationId=`. Comprueba dueño y si ya hay compra (`getPurchaseByReservation`). Muestra resumen + formulario de tarjeta (valida **solo el formato**: 16 dígitos, `MM/YY`, CVC 3–4; formatea al escribir). Al enviar → `payReservation()` → pantalla de éxito con el nº de ticket. |
| `ticket.js` | ticket.html | Lee `?reservationId=`. `getPurchaseByReservation` + póster de TMDB. Pinta el ticket premium con `fakeQrSvg(ticketId)`. GSAP: el ticket se desliza y el QR aparece con un "pop". |
| `my-reservations.js` | reservations.html | `getUserReservations` + `getUserPurchases`. Estado **efectivo** de cada reserva: `cancelled` \| (hay compra → `paid`) \| `reserved`. Botones según estado (Pay now / Cancel / Ver ticket). El botón Cancel: `confirm()` → `cancelReservation()` → actualiza la tarjeta en el sitio. |
| `my-tickets.js` | tickets.html | `getUserPurchases` → tarjetas con el nº de ticket y "Ver ticket". |
| `my-favorites.js` | favorites.html | `getUserFavorites` → por cada uno pide la ficha fresca a TMDB (`getMovieDetails`/`getTvDetails`) y pinta `createMovieCard`/`createTvCard`. |

#### `booking.js` en detalle
```js
const state = { ctx: null, selected: [], quantity: 2 };
const MAX_SEATS = 8;

// gate al final del archivo:
if (!isLoggedIn()) requireAuth();   // sin sesión -> a login
else init();

async function init() {
  state.ctx = await getFunctionContext(functionId);   // { fn, room, rows }
  render(main);
}

function render(main) {
  // pinta: resumen de la función + mapa de butacas + panel lateral (tickets, selección, total, Reservar)
  renderSeatMap($("#seat-map"), rows);   // por cada fila, por cada butaca: crea <cinema-seat>
  //   seatEl.setAttribute("status", seat.status); seatEl.seatId = seat.seatId;
  //   el mapa escucha "seat-toggle"
}

function onSeatToggle(event) {
  const { seatId, seatCode, location, selected } = event.detail;
  if (selected) {
    state.selected.push({ seatId, seatCode, location });
    if (state.selected.length > state.quantity) {
      if (state.quantity < MAX_SEATS) state.quantity = state.selected.length;   // sube tickets solo
      else { state.selected.pop(); event.target.setAttribute("status","available"); showHint("Máximo 8…"); return; }
    }
  } else {
    state.selected = state.selected.filter((s) => s.seatId !== seatId);
  }
  updateSidebar();
}

function updateSidebar() {
  // lista "C5 · Centro", total = precio * nº seleccionadas
  // Reservar habilitado SOLO si  state.selected.length === state.quantity
}

async function onReserve() {
  const check = await checkSeatsAvailable(fn.id, seatIds);   // re-chequeo
  if (!check.ok) { showHint("Ya no están libres: …"); return; }
  showFinalSummary();   // "RESUMEN DE LA RESERVA" + Confirmar / Cancelar
}

async function onConfirm() {
  const reservation = await createReservation({ ctx: state.ctx, selectedSeats: state.selected });
  showReservationSuccess(reservation);   // marca las butacas "reserved" en el mapa y bloquea el panel
}
```

---

## 9. Scripts · `scripts/`

### `seed.js` — genera `db.json`
```js
async function seed() {
  const days = buildDays();                    // [hoy, hoy+1, …, hoy+6]
  const movies = await getMovies();            // 14 pelis reales de TMDB (o 6 de reserva si falla)

  const rooms = ROOMS.map(…);                   // 3 salas
  const seats = buildSeats();                   // 136 butacas (filas × columnas por sala)
  const functions = buildFunctions(days, movies); // 63: por cada día × horario × sala, 1 peli (rotando)
  const functionSeats = buildFunctionSeats(functions, seats);  // 2.856: butaca × función
  const { reservations, purchases } = buildSeedBookings(functions, seats, movies);  // 5 reservas de ejemplo
  applyBookingStatus(functionSeats, reservations, purchases);  // deja functionSeats coherente

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + "\n");
}
```
- `buildSeats`: por cada sala, `rows` filas (A, B, C…) × `seatsPerRow` butacas.
  `location`: filas A-B = `front`, C-D = `center`, E+ = `back`.
- `buildFunctions`: 7 días × 3 horarios × 3 salas = 63. La película rota por `movieIndex % movies.length`.
- `buildFunctionSeats`: por cada función, una fila por cada butaca de su sala (todas `"available"`).
- `buildSeedBookings`: 5 reservas del usuario `user-1`, sin butacas repetidas por función.
- `applyBookingStatus`: marca en `functionSeats` como `reserved`/`sold` las butacas de las
  reservas/compras de ejemplo (solo en la generación; en runtime la app deriva el estado).

### `check-tmdb.js`
Verifica el token pidiendo las 6 películas de reserva a `/movie/{id}`. Sale con código 1 si
falta el token o alguna película no resuelve.
