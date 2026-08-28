# CINEHUB

Aplicación web para consultar películas y comprar boletos de cine.

Proyecto académico construido con **JavaScript Vanilla** (sin frameworks): HTML5, CSS
Vanilla, ES Modules, Fetch API, Web Components y GSAP. Los datos cinematográficos vienen
de la **API de TMDB**; los datos operativos del cine (salas, funciones, sillas, reservas,
compras) se gestionan con **JSON Server**.

## Requisitos

- [Node.js](https://nodejs.org) LTS (incluye `npm`)

## Instalación

```bash
npm install
```

## Configuración de TMDB

1. Crea una cuenta en https://www.themoviedb.org/ y solicita una API Key.
2. Copia tu **API Read Access Token (v4)**.
3. Pégalo en `js/config.js` (variable `TMDB_TOKEN`).

> El archivo `js/config.js` contiene el token en el frontend porque el proyecto no tiene
> backend. Es aceptable para un proyecto académico (token de solo lectura).

## Ejecutar el proyecto

Levanta el backend simulado y el servidor web a la vez:

```bash
npm start
```

- Web:  http://localhost:5500
- API (JSON Server):  http://localhost:3000

O por separado:

```bash
npm run api    # solo JSON Server  (localhost:3000)
npm run dev    # solo servidor web (localhost:5500)
```

## Estructura

```
cinehub/
├── index.html            → Homepage
├── db.json               → Base de datos de JSON Server
├── pages/                → Resto de páginas (MPA)
├── css/                  → Estilos (variables.css primero)
├── js/
│   ├── config.js         → Configuración (TMDB token, URLs)
│   ├── services/         → Acceso a datos (TMDB y JSON Server)
│   ├── components/       → Web Components (<cinema-seat>, <app-modal>)
│   ├── modules/          → Lógica por funcionalidad
│   ├── ui/               → Render y estados (loading/error/empty)
│   └── utils/            → Helpers reutilizables
├── scripts/seed.js       → Genera datos de db.json (salas, funciones, sillas)
└── assets/               → Imágenes e iconos
```
