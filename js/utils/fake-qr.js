// js/utils/fake-qr.js
// Genera un SVG que PARECE un código QR a partir de un texto. NO es escaneable
// (decisión D7): es decorativo para el ticket digital. Determinista: el mismo
// texto produce siempre el mismo patrón.

/** PRNG determinista (mulberry32). */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** hash djb2 -> entero de 32 bits sin signo. */
function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * @param {string} text
 * @param {number} modules  nº de celdas por lado (por defecto 25)
 * @returns {string} SVG
 */
export function fakeQrSvg(text, modules = 25) {
  const rand = mulberry32(hash(String(text)));

  const CELL = 8;
  const QUIET = 2; // margen en celdas
  const totalCells = modules + QUIET * 2;
  const dim = totalCells * CELL;

  // ¿la celda (r,c) está dentro de uno de los 3 "ojos" (finder patterns)?
  const inFinder = (r, c) =>
    (r < 7 && c < 7) ||
    (r < 7 && c >= modules - 7) ||
    (r >= modules - 7 && c < 7);

  // dibujo del ojo 7x7: marco exterior + cuadrado central 3x3
  const finderOn = (r, c) => {
    const local = (or, oc) => {
      const rr = r - or;
      const cc = c - oc;
      if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return true;
      return rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
    };
    if (r < 7 && c < 7) return local(0, 0);
    if (r < 7 && c >= modules - 7) return local(0, modules - 7);
    return local(modules - 7, 0);
  };

  let rects = "";
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      const on = inFinder(r, c) ? finderOn(r, c) : rand() > 0.52;
      if (!on) continue;
      const x = (c + QUIET) * CELL;
      const y = (r + QUIET) * CELL;
      rects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="100%" height="100%" role="img" aria-label="Código del ticket">
    <rect width="${dim}" height="${dim}" fill="#ffffff"/>
    <g fill="#0b0b0d">${rects}</g>
  </svg>`;
}
