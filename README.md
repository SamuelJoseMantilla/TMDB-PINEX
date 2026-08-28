# 🎬 CINEHUB

Aplicación web para **consultar la cartelera de un cine y comprar boletos**, con
selección visual de butacas, tickets digitales, favoritos y reseñas.

Proyecto académico construido **100% en JavaScript Vanilla** (sin frameworks ni librerías
de UI). La información cinematográfica se obtiene en vivo de la **API de TMDB**; los datos
operativos del cine (salas, funciones, butacas, reservas, compras) se gestionan con
**JSON Server**.

---

## 🧰 Tecnologías

| | |
|---|---|
| **HTML5** semántico | landmarks, `aria-*`, `<template>`, `<dialog>`-like modal |
| **CSS Vanilla** | variables CSS, Flexbox, CSS Grid, `scroll-snap`, media queries, `prefers-reduced-motion` |
| **JavaScript** | ES Modules (`import`/`export`), `async/await`, `try/catch`, clases |
| **Fetch API** | todas las peticiones (TMDB y JSON Server) |
| **Web Components** | `<cinema-seat>` (Shadow DOM), `<app-modal>`, `<site-header>`, `<site-footer>` (light DOM) |
| **GSAP** + ScrollTrigger | animaciones (local, sin CDN, en `assets/vendor/`) |
| **TMDB API** | películas, series, reparto, personas, trailers, géneros, búsqueda |
| **JSON Server** | backend REST simulado sobre `db.json` |

Sin React / Vue / Angular · sin Bootstrap / Tailwind · sin jQuery · sin backend real.

---

## ✅ Funcionalidades

### Películas (TMDB)
- **Hero** con película destacada · **Now Showing** (cartelera real de CINEHUB) · **Trending Now**
- **Coming Soon** · **Featured Trailers** con modal de reproducción (YouTube)
- **Explore by Category** (géneros) · **Búsqueda** por título
- **Página de detalle**: backdrop, sinopsis, rating, duración, géneros, director, reparto, trailer y **funciones disponibles**
- **"Don't know what to watch?"** — selección aleatoria animada
- **Página Movies** con pestañas (En cartelera / Tendencia / Próximamente)

### Series de TV (TMDB)
- Fila **"Series populares"** en la portada · página **Series** con pestañas
- **Ficha de serie**: temporadas, creador, reparto, trailer

### Filmografía
- Clic en cualquier **actor del reparto** → su ficha con biografía y **todas sus películas**

### Reserva y compra
- **Quick Booking** (película + fecha + hora → funciones) con selects en cascada
- **Selección de butacas** con el Web Component `<cinema-seat>`: mapa por filas, leyenda, estados (disponible / seleccionada / reservada / vendida), recomendación "mejor vista"
- **Contador de tickets** (butacas = tickets) · **resumen en vivo** · validaciones
- **Crear reserva** → **My Reservations** → **Cancelar** (libera butacas) o **Pagar**
- **Pago simulado** → **compra** → **ticket digital** con código QR visual · **My Tickets**
- **Popular at CINEHUB**: Top 3 calculado agrupando reservas por película

### Cuenta
- **Registro / Login / Logout** (autenticación simulada, sesión en `localStorage` sin contraseña)
- El header cambia a menú de usuario al iniciar sesión
- **Favoritos** de películas y series (♥ en las fichas) · página **Favoritos**
- **Reseñas y calificaciones** (1–5 estrellas + comentario) en películas y series · nota media

---

## 🚀 Puesta en marcha

### 1. Requisitos
- [Node.js](https://nodejs.org) LTS (incluye `npm`)

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar TMDB
1. Crea una cuenta en <https://www.themoviedb.org/> y solicita una API Key en
   <https://www.themoviedb.org/settings/api>.
2. Copia tu **API Read Access Token (v4)** (empieza por `eyJ...`).
3. Crea tu archivo de configuración desde la plantilla:
   ```bash
   cp js/config.example.js js/config.js          # Git Bash / Linux / macOS
   # Copy-Item js/config.example.js js/config.js  # PowerShell
   ```
4. Pega el token en `js/config.js` → constante `TMDB_TOKEN`.
5. Verifica:
   ```bash
   npm run check:tmdb
   ```

> `js/config.js` está en `.gitignore`. El token vive en el frontend porque el proyecto no
> tiene backend; es aceptable en un proyecto académico (token de solo lectura).

### 4. Generar los datos del cine
```bash
npm run seed
```
Genera `db.json`: 2 usuarios, 3 salas, 136 butacas, 63 funciones (14 películas reales de
TMDB, hoy + 6 días), ~2.856 `functionSeats` y 5 reservas de ejemplo.

### 5. Arrancar
```bash
npm start
```
| | |
|---|---|
| Web | <http://localhost:5500> |
| API (JSON Server) | <http://localhost:3000> |

O por separado: `npm run api` · `npm run dev`.

### Cuentas de prueba
| Correo | Contraseña |
|---|---|
| `vale@cinehub.com` | `cinehub123` |
| `demo@cinehub.com` | `demo1234` |

---

## 🗂️ Estructura

```
cinehub/
├── index.html                 Homepage
├── db.json                    Base de datos de JSON Server (generada por seed.js)
├── json-server.json           Config de JSON Server (puerto)
├── package.json               Scripts: start · api · dev · seed · check:tmdb
│
├── pages/                     Páginas (MPA · estado por query params)
│   ├── movie.html  tv.html  person.html   Fichas (película / serie / actor)
│   ├── movies.html  series.html  category.html  search.html   Catálogos
│   ├── login.html  register.html
│   ├── booking.html  payment.html  ticket.html
│   └── reservations.html  tickets.html  favorites.html
│
├── css/                       variables.css (tokens) + reset/base + componentes + por página
│
├── js/
│   ├── config.js              TMDB token, URLs base (NO se sube)
│   ├── main.js                Orquestador de la Homepage
│   │
│   ├── services/
│   │   ├── tmdb.service.js    ÚNICO módulo que llama a TMDB
│   │   └── api.service.js     ÚNICO módulo que llama a JSON Server (CRUD genérico)
│   │
│   ├── components/            Web Components
│   │   ├── cinema-seat.js     <cinema-seat> (Shadow DOM)
│   │   ├── app-modal.js       <app-modal> (trailer)
│   │   └── site-header.js / site-footer.js   (light DOM, compartidos)
│   │
│   ├── modules/               Lógica por funcionalidad (auth, booking, reservations,
│   │                          purchases, seats, ratings, favorites, hero, trailers…)
│   ├── ui/                    render.js · states.js · reviews.js · favorite-button.js
│   ├── utils/                 dom.js · helpers.js · storage.js · fake-qr.js
│   └── lib/gsap.js            Puente GSAP global → ES modules
│
├── scripts/
│   ├── seed.js                Genera db.json (salas, butacas, funciones, functionSeats…)
│   └── check-tmdb.js          Verifica el token de TMDB
│
└── assets/vendor/             GSAP + ScrollTrigger (local)
```

---

## 🧠 Decisiones de arquitectura

### Dos fuentes de datos, siempre separadas
- **TMDB** = qué es la película (poster, sinopsis, reparto). Solo lectura, externa.
- **JSON Server / `db.json`** = el negocio del cine (salas, funciones, reservas, compras). Lectura/escritura.

Ningún módulo hace `fetch` fuera de `js/services/`.

### MPA con query params
Cada pantalla es un `.html` real. El estado entre páginas viaja en la URL
(`?id=`, `?functionId=`, `?reservationId=`, `?q=`, `?genre=`) y la sesión en `localStorage`.

### Disponibilidad de butacas **derivada**
Aunque existe la colección `functionSeats` (un registro por función × butaca), la
disponibilidad real se **calcula** a partir de `reservations` + `purchases`:

```
butaca "sold"      ⟺  aparece en algún purchase de esa función
butaca "reserved"  ⟺  aparece en alguna reservation activa de esa función
butaca "available" ⟺  ninguna de las anteriores
```

Así **reservar / cancelar = 1 sola escritura**. JSON Server (que reescribe todo `db.json`
en cada operación) pierde escrituras al encadenar varias seguidas; derivar el estado lo evita.

### Orden de operaciones (consistencia)
- **Reservar**: bloquear butacas → crear la reserva al final. Si falla, se revierte.
- **Cancelar**: liberar butacas primero → marcar `cancelled` después.
- **Pagar**: crear el `purchase` (única escritura bloqueante) → marcar `paid` en segundo plano.

### Autenticación simulada
`login` compara la contraseña **en el cliente** contra `GET /users?email=…` y guarda
`{ id, name, email }` en `localStorage` (nunca la contraseña). No es seguro — es la
práctica estándar en un proyecto académico con JSON Server.

---

## 🗃️ Modelo de datos (`db.json`)

| Colección | Descripción |
|---|---|
| `users` | cuentas (`id, name, email, password`) |
| `rooms` | salas (`id, name, rows, seatsPerRow, capacity, type`) |
| `seats` | butacas físicas por sala (`row, number, seatCode, location`) |
| `functions` | proyecciones (`tmdbId, movieTitle, roomId, date, time, price, format`) |
| `functionSeats` | butaca × función (modelo relacional; estado ilustrativo) |
| `reservations` | reservas (`userId, tmdbId, functionId, seatIds, total, status, createdAt`) |
| `purchases` | compras pagadas (`reservationId, ticketId, seatIds, total, purchasedAt`) |
| `favorites` | favoritos (`userId, mediaType, tmdbId, title, posterPath`) |
| `ratings` | reseñas (`userId, userName, mediaType, tmdbId, score, comment, createdAt`) |

---

## 📜 Scripts de npm

| Comando | Qué hace |
|---|---|
| `npm start` | Levanta JSON Server (`:3000`) + servidor web (`:5500`) |
| `npm run api` | Solo JSON Server |
| `npm run dev` | Solo servidor web |
| `npm run seed` | Regenera `db.json` |
| `npm run check:tmdb` | Verifica el token de TMDB |
