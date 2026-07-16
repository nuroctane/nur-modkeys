/**
 * Photo → board colour sampling (classical CV pipeline).
 *
 * Pipeline (photo → board detect → role colors → key paint):
 *  1. Downscale for analysis
 *  2. detectBoardBox — largest non-background connected component
 *  3. extractPalette — k-means + median swatches + vivid accent rescue
 *  4. autoAssign — case / alpha / mod / accent / glow roles
 *  5. detectKeycapBox — shrink bezel; seed 4-corner quad
 *  6. copyColorsFromPhoto — projective unit→quad + median window per key
 *
 * Corners stay in full-image pixel space for the UI handles.
 */
import { LAYOUTS } from '../data/layouts.js';
import { state } from './state.js';
import { keyId, setOverride, getSelectedIds } from './perKey.js';

/** @type {PhotoSession | null} */
let session = null;

/**
 * @typedef {{
 *   img: HTMLImageElement,
 *   w: number,
 *   h: number,
 *   corners: {x:number,y:number}[],
 *   assign: {
 *     alpha:string, mod:string, accent:string,
 *     caseC:string, glow:string, plate:string, switch:string,
 *   } | null,
 *   palette: string[],
 *   boardBox: number[] | null,
 *   keyBox: number[] | null,
 * }} PhotoSession
 */

/** Default which board parts adopt photo colours (Customize toggles). */
export const DEFAULT_PHOTO_APPLY = {
  keys: true,
  case: true,
  plate: true,
  light: true,
  switch: true,
};

export function getPhotoApply() {
  if (!state.photoMatchApply) {
    state.photoMatchApply = { ...DEFAULT_PHOTO_APPLY };
  }
  return state.photoMatchApply;
}

export function setPhotoApply(partial) {
  const cur = getPhotoApply();
  Object.assign(cur, partial || {});
  state.photoMatchApply = cur;
  return cur;
}

export function getPhotoSession() {
  return session;
}

export function clearPhotoSession() {
  session = null;
}

export function hasPhotoSession() {
  return !!(session && session.img);
}

/** Role colours / palette from last analysis (null if none). */
export function getPhotoMatchMeta() {
  if (!session?.assign) return null;
  return {
    assign: { ...session.assign },
    palette: session.palette.slice(),
    boardBox: session.boardBox ? session.boardBox.slice() : null,
    keyBox: session.keyBox ? session.keyBox.slice() : null,
  };
}

const hex2 = (n) => ('0' + (n & 255).toString(16)).slice(-2);
function rgbHex(r, g, b) {
  return '#' + hex2(Math.round(r)) + hex2(Math.round(g)) + hex2(Math.round(b));
}

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return [128, 128, 128];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function lumaOfHex(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function legendFor(bg) {
  return lumaOfHex(bg) > 0.55 ? '#26221d' : '#f3ede2';
}

function autoFg(r, g, b) {
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#1a1a1a' : '#f4f4f4';
}

/* ── analysis buffer ─────────────────────────────────────────── */

function photoData(img, maxDim = 280) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scl = Math.min(1, maxDim / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scl));
  const h = Math.max(1, Math.round(ih * scl));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  return { data: g.getImageData(0, 0, w, h).data, w, h };
}

/* ── board / keycap detection ────────────────────────────────── */

/** Largest non-bg connected component vs corner-sampled desk colour. */
function detectBoardBox(data, w, h) {
  const s = Math.max(2, Math.round(Math.min(w, h) * 0.05));
  const cr = [], cg = [], cb = [];
  [
    [0, 0],
    [w - s, 0],
    [0, h - s],
    [w - s, h - s],
  ].forEach(([ox, oy]) => {
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = ((oy + y) * w + (ox + x)) * 4;
        cr.push(data[i]);
        cg.push(data[i + 1]);
        cb.push(data[i + 2]);
      }
    }
  });
  const med = (a) => {
    const t = a.slice().sort((p, q) => p - q);
    return t[t.length >> 1];
  };
  const bg = [med(cr), med(cg), med(cb)];
  const N = w * h;
  const fg = new Uint8Array(N);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    fg[p] =
      Math.abs(data[i] - bg[0]) +
        Math.abs(data[i + 1] - bg[1]) +
        Math.abs(data[i + 2] - bg[2]) >
      60
        ? 1
        : 0;
  }
  const seen = new Uint8Array(N);
  const queue = new Int32Array(N);
  let best = null;
  let bestSize = 0;
  for (let start = 0; start < N; start++) {
    if (!fg[start] || seen[start]) continue;
    let head = 0;
    let tail = 0;
    let size = 0;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    queue[tail++] = start;
    seen[start] = 1;
    while (head < tail) {
      const p = queue[head++];
      const x = p % w;
      const y = (p / w) | 0;
      size++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (fg[q] && !seen[q]) {
            seen[q] = 1;
            queue[tail++] = q;
          }
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = [x0, y0, x1, y1];
    }
  }
  if (!best || bestSize < N * 0.02) return [0, 0, 1, 1];
  return [best[0] / w, best[1] / h, best[2] / w, best[3] / h];
}

/** Shrink board box to keycap field (drop case bezel). */
function detectKeycapBox(data, w, h, box, caseHex) {
  const cc = hexToRgb(caseHex);
  let bx0 = Math.max(1, Math.floor(box[0] * w));
  let by0 = Math.max(1, Math.floor(box[1] * h));
  let bx1 = Math.min(w - 2, Math.ceil(box[2] * w));
  let by1 = Math.min(h - 2, Math.ceil(box[3] * h));
  const ex = Math.max(2, Math.round((bx1 - bx0) * 0.015));
  const ey = Math.max(2, Math.round((by1 - by0) * 0.015));
  bx0 += ex;
  bx1 -= ex;
  by0 += ey;
  by1 -= ey;
  const lum = (x, y) => {
    const i = (y * w + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  const isKey = (x, y) => {
    const i = (y * w + x) * 4;
    const dc =
      Math.abs(data[i] - cc[0]) +
      Math.abs(data[i + 1] - cc[1]) +
      Math.abs(data[i + 2] - cc[2]);
    if (dc > 44) return true;
    const g =
      Math.abs(lum(x + 1, y) - lum(x - 1, y)) +
      Math.abs(lum(x, y + 1) - lum(x, y - 1));
    return g > 22;
  };
  const colF = new Float32Array(w);
  const rowF = new Float32Array(h);
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      if (isKey(x, y)) {
        colF[x]++;
        rowF[y]++;
      }
    }
  }
  for (let x = bx0; x <= bx1; x++) colF[x] /= by1 - by0 + 1;
  for (let y = by0; y <= by1; y++) rowF[y] /= bx1 - bx0 + 1;
  const run = Math.max(2, Math.round(Math.min(w, h) * 0.012));
  const edge = (arr, lo, hi, thr) => {
    const solid = (i, dir) => {
      for (let j = 0; j < run; j++) {
        const k = i + j * dir;
        if (k < lo || k > hi || (arr[k] || 0) < thr) return false;
      }
      return true;
    };
    let a = lo;
    let b = hi;
    while (a < hi && !solid(a, 1)) a++;
    while (b > lo && !solid(b, -1)) b--;
    return [a, b];
  };
  const [kx0, kx1] = edge(colF, bx0, bx1, 0.3);
  const [ky0, ky1] = edge(rowF, by0, by1, 0.3);
  if (kx1 - kx0 < (bx1 - bx0) * 0.4 || ky1 - ky0 < (by1 - by0) * 0.4) {
    return box.slice();
  }
  return [kx0 / w, ky0 / h, kx1 / w, ky1 / h];
}

/* ── palette: k-means + median + accent rescue ───────────────── */

function extractPalette(data, w, h, box, k = 7) {
  const bx0 = box[0] * w;
  const by0 = box[1] * h;
  const bx1 = box[2] * w;
  const by1 = box[3] * h;
  const bw = bx1 - bx0 || 1;
  const bh = by1 - by0 || 1;
  const pts = [];
  const pos = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const p = i >> 2;
    const x = p % w;
    const y = (p / w) | 0;
    if (x < bx0 || x > bx1 || y < by0 || y > by1) continue;
    pts.push([data[i], data[i + 1], data[i + 2]]);
    pos.push([(x - bx0) / bw, (y - by0) / bh]);
  }
  if (!pts.length) return [];

  const cents = [];
  for (let i = 0; i < k; i++) {
    cents.push(pts[Math.floor((i * (pts.length - 1)) / (k - 1 || 1))].slice());
  }
  const asn = new Array(pts.length).fill(0);
  for (let it = 0; it < 10; it++) {
    for (let p = 0; p < pts.length; p++) {
      let bd = 1e12;
      let bi = 0;
      for (let c = 0; c < cents.length; c++) {
        const dx = pts[p][0] - cents[c][0];
        const dy = pts[p][1] - cents[c][1];
        const dz = pts[p][2] - cents[c][2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bd) {
          bd = d;
          bi = c;
        }
      }
      asn[p] = bi;
    }
    const sum = cents.map(() => [0, 0, 0, 0]);
    for (let p = 0; p < pts.length; p++) {
      const a = asn[p];
      sum[a][0] += pts[p][0];
      sum[a][1] += pts[p][1];
      sum[a][2] += pts[p][2];
      sum[a][3]++;
    }
    for (let c = 0; c < cents.length; c++) {
      if (sum[c][3]) {
        cents[c] = [
          sum[c][0] / sum[c][3],
          sum[c][1] / sum[c][3],
          sum[c][2] / sum[c][3],
        ];
      }
    }
  }

  const st = cents.map(() => ({
    n: 0,
    border: 0,
    center: 0,
    sx: 0,
    sy: 0,
    sx2: 0,
    sy2: 0,
    rv: [],
    gv: [],
    bv: [],
  }));
  const vv = { rv: [], gv: [], bv: [], n: 0, border: 0, center: 0 };
  for (let p = 0; p < pts.length; p++) {
    const s = st[asn[p]];
    const x = pos[p][0];
    const y = pos[p][1];
    const R = pts[p][0];
    const G = pts[p][1];
    const B = pts[p][2];
    s.n++;
    s.sx += x;
    s.sy += y;
    s.sx2 += x * x;
    s.sy2 += y * y;
    s.rv.push(R);
    s.gv.push(G);
    s.bv.push(B);
    const inCenter = x > 0.15 && x < 0.85 && y > 0.15 && y < 0.85;
    if (inCenter) s.center++;
    else s.border++;
    const mx = Math.max(R, G, B);
    const mn = Math.min(R, G, B);
    if (mx > 40 && mx < 250 && (mx - mn) / mx > 0.45) {
      vv.rv.push(R);
      vv.gv.push(G);
      vv.bv.push(B);
      vv.n++;
      if (inCenter) vv.center++;
      else vv.border++;
    }
  }
  const median = (arr) => {
    if (!arr.length) return 0;
    const a = arr.slice().sort((p, q) => p - q);
    return a[a.length >> 1];
  };
  let pal = st
    .map((s) => {
      const n = s.n || 1;
      const r = median(s.rv);
      const gg = median(s.gv);
      const b = median(s.bv);
      const mx = Math.max(r, gg, b);
      const mn = Math.min(r, gg, b);
      const cx = s.sx / n;
      const cy = s.sy / n;
      const spread = Math.sqrt(
        Math.max(0, s.sx2 / n - cx * cx) + Math.max(0, s.sy2 / n - cy * cy),
      );
      return {
        r,
        g: gg,
        b,
        hex: rgbHex(r, gg, b),
        count: s.n,
        border: s.border,
        center: s.center,
        borderFrac: s.n ? s.border / s.n : 0,
        spread,
        sat: mx ? (mx - mn) / mx : 0,
        lum: (0.299 * r + 0.587 * gg + 0.114 * b) / 255,
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const merged = [];
  pal.forEach((c) => {
    const near = merged.find(
      (m) =>
        Math.abs(m.r - c.r) + Math.abs(m.g - c.g) + Math.abs(m.b - c.b) < 28,
    );
    if (near) {
      near.count += c.count;
      near.border += c.border;
      near.center += c.center;
      near.borderFrac = near.count ? near.border / near.count : 0;
    } else {
      merged.push(c);
    }
  });

  if (vv.n > pts.length * 0.0022) {
    const vr = median(vv.rv);
    const vg = median(vv.gv);
    const vb = median(vv.bv);
    const near = merged.find(
      (m) =>
        Math.abs(m.r - vr) + Math.abs(m.g - vg) + Math.abs(m.b - vb) < 40,
    );
    if (!near) {
      const mx = Math.max(vr, vg, vb);
      const mn = Math.min(vr, vg, vb);
      merged.push({
        r: vr,
        g: vg,
        b: vb,
        hex: rgbHex(vr, vg, vb),
        count: vv.n,
        border: vv.border,
        center: vv.center,
        borderFrac: vv.n ? vv.border / vv.n : 0,
        spread: 0.3,
        sat: mx ? (mx - mn) / mx : 0,
        lum: (0.299 * vr + 0.587 * vg + 0.114 * vb) / 255,
      });
    }
  }
  return merged;
}

/**
 * Median colour of the rim between board box and keycap field —
 * usually plate / mounting rail, not outer case bezel.
 */
function samplePlateFromFrame(data, w, h, boardBox, keyBox) {
  const bx0 = Math.floor(boardBox[0] * w);
  const by0 = Math.floor(boardBox[1] * h);
  const bx1 = Math.ceil(boardBox[2] * w);
  const by1 = Math.ceil(boardBox[3] * h);
  const kx0 = Math.floor(keyBox[0] * w);
  const ky0 = Math.floor(keyBox[1] * h);
  const kx1 = Math.ceil(keyBox[2] * w);
  const ky1 = Math.ceil(keyBox[3] * h);
  const rv = [];
  const gv = [];
  const bv = [];
  const step = Math.max(1, Math.round(Math.min(w, h) / 80));
  for (let y = by0; y <= by1; y += step) {
    for (let x = bx0; x <= bx1; x += step) {
      const inKey = x >= kx0 && x <= kx1 && y >= ky0 && y <= ky1;
      if (inKey) continue;
      const i = (y * w + x) * 4;
      if (data[i + 3] < 128) continue;
      rv.push(data[i]);
      gv.push(data[i + 1]);
      bv.push(data[i + 2]);
    }
  }
  if (rv.length < 8) return null;
  const med = (a) => {
    const t = a.slice().sort((p, q) => p - q);
    return t[t.length >> 1];
  };
  return rgbHex(med(rv), med(gv), med(bv));
}

function hexDist(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

function autoAssign(pal, framePlateHex) {
  if (!pal.length) {
    return {
      alpha: '#cccccc',
      mod: '#888888',
      accent: '#cc785c',
      caseC: '#2a2a2e',
      glow: '#cc785c',
      plate: '#8a7a55',
      switch: '#cc785c',
    };
  }
  const caseScore = (c) =>
    c.border * (1 + (1 - c.sat) * 0.4 + (1 - c.lum) * 0.15);
  const frameCand = pal.filter((c) => c.borderFrac > 0.35);
  const caseC =
    (frameCand.length ? frameCand : pal)
      .slice()
      .sort((a, b) => caseScore(b) - caseScore(a))[0] ||
    pal.slice().sort((a, b) => a.lum - b.lum)[0] ||
    pal[0];
  const rest1 = pal.filter((c) => c !== caseC);
  const alpha =
    rest1.slice().sort((a, b) => b.center - a.center)[0] || pal[0];
  const rest2 = rest1.filter((c) => c !== alpha);
  const accScore = (c) =>
    c.sat * 0.8 + (1 - Math.min(1, c.spread * 2)) * 0.2;
  const accCand = rest2.slice().sort((a, b) => accScore(b) - accScore(a));
  const accent = accCand.find((c) => c.sat > 0.15) || accCand[0] || alpha;
  const rest3 = rest2.filter((c) => c !== accent);
  const mod =
    rest3.slice().sort((a, b) => b.center - a.center)[0] ||
    rest3[0] ||
    alpha;

  /* plate: prefer measured rim; else mid-luma palette colour ≠ case/alpha */
  let plateHex = framePlateHex;
  if (!plateHex || hexDist(plateHex, caseC.hex) < 22) {
    const plateCand = pal
      .filter((c) => c !== caseC && c !== alpha)
      .slice()
      .sort((a, b) => {
        const midA = 1 - Math.abs(a.lum - 0.45);
        const midB = 1 - Math.abs(b.lum - 0.45);
        return midB - midA;
      })[0];
    plateHex = plateCand?.hex || mod.hex || caseC.hex;
  }

  /* switch stem: vivid accent, else most saturated remaining */
  const switchHex = accent.hex;

  return {
    alpha: alpha.hex,
    mod: mod.hex,
    accent: accent.hex,
    caseC: caseC.hex,
    glow: accent.hex,
    plate: plateHex,
    switch: switchHex,
  };
}

/* ── projective map unit square → photo quad ─────────────────── */
/* corners as normalised [x,y] in [0,1]², order TL TR BR BL */

function unitToQuad(q) {
  const [x0, y0] = q[0];
  const [x1, y1] = q[1];
  const [x2, y2] = q[2];
  const [x3, y3] = q[3];
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  let a, b, c, d, e, f, g, h;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    a = x1 - x0;
    b = x3 - x0;
    c = x0;
    d = y1 - y0;
    e = y3 - y0;
    f = y0;
    g = 0;
    h = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
    a = x1 - x0 + g * x1;
    b = x3 - x0 + h * x3;
    c = x0;
    d = y1 - y0 + g * y1;
    e = y3 - y0 + h * y3;
    f = y0;
  }
  return { a, b, c, d, e, f, g, h };
}

function mapH(H, u, v) {
  const den = H.g * u + H.h * v + 1 || 1e-9;
  return [
    (H.a * u + H.b * v + H.c) / den,
    (H.d * u + H.e * v + H.f) / den,
  ];
}

/** Median RGB in a window — robust to gaps, legends, speculars. */
function sampleMedian(data, w, h, px, py, rad) {
  const rv = [];
  const gv = [];
  const bv = [];
  const r0 = Math.max(1, rad | 0);
  for (let dy = -r0; dy <= r0; dy++) {
    for (let dx = -r0; dx <= r0; dx++) {
      const x = Math.min(w - 1, Math.max(0, px + dx));
      const y = Math.min(h - 1, Math.max(0, py + dy));
      const i = (y * w + x) * 4;
      rv.push(data[i]);
      gv.push(data[i + 1]);
      bv.push(data[i + 2]);
    }
  }
  const med = (a) => {
    const t = a.slice().sort((p, q) => p - q);
    return t[t.length >> 1];
  };
  return [med(rv), med(gv), med(bv)];
}

function defaultCorners(w, h) {
  return [
    { x: w * 0.08, y: h * 0.12 },
    { x: w * 0.92, y: h * 0.12 },
    { x: w * 0.92, y: h * 0.88 },
    { x: w * 0.08, y: h * 0.88 },
  ];
}

function cornersFromKeyBox(kb, w, h) {
  /* kb normalised [x0,y0,x1,y1] → full-image pixel corners TL TR BR BL */
  return [
    { x: kb[0] * w, y: kb[1] * h },
    { x: kb[2] * w, y: kb[1] * h },
    { x: kb[2] * w, y: kb[3] * h },
    { x: kb[0] * w, y: kb[3] * h },
  ];
}

/**
 * Run board detect + palette + role assign + auto keycap corners.
 * Mutates session; returns { assign, palette } or null on failure.
 */
export function analyzePhotoSession() {
  if (!session?.img) return null;
  const { data, w, h } = photoData(session.img, 280);
  const boardBox = detectBoardBox(data, w, h);
  const pal = extractPalette(data, w, h, boardBox, 7);
  if (!pal.length) {
    session.boardBox = boardBox;
    session.keyBox = boardBox;
    session.assign = null;
    session.palette = [];
    session.corners = defaultCorners(session.w, session.h);
    return null;
  }
  /* provisional case for keycap shrink, then full assign with plate rim */
  const provisional = autoAssign(pal, null);
  const keyBox = detectKeycapBox(data, w, h, boardBox, provisional.caseC);
  const framePlate = samplePlateFromFrame(data, w, h, boardBox, keyBox);
  const assign = autoAssign(pal, framePlate);
  session.boardBox = boardBox;
  session.keyBox = keyBox;
  session.assign = assign;
  session.palette = pal.map((c) => c.hex);
  session.corners = cornersFromKeyBox(keyBox, session.w, session.h);
  return { assign, palette: session.palette };
}

/** Load File/Blob, analyze, seed auto-quad. */
export function loadPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      session = {
        img,
        w,
        h,
        corners: defaultCorners(w, h),
        assign: null,
        palette: [],
        boardBox: null,
        keyBox: null,
      };
      analyzePhotoSession();
      resolve(session);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export function setCorners(corners) {
  if (!session) return;
  session.corners = corners.map((c) => ({ x: c.x, y: c.y }));
}

/**
 * State patch for photo roles / board parts.
 * Honours state.photoMatchApply toggles (case / plate / light / switch).
 * Keycap customColors always applied as base when any role is present.
 * @param {{ force?: Partial<typeof DEFAULT_PHOTO_APPLY> }} [opts]
 */
export function photoRolesStatePatch(opts = {}) {
  const a = session?.assign;
  if (!a) return null;
  const apply = { ...getPhotoApply(), ...(opts.force || {}) };
  const soft = lumaOfHex(a.caseC) < 0.45;
  const patch = {
    customColors: {
      a: { bg: a.alpha, fg: legendFor(a.alpha) },
      m: { bg: a.mod, fg: legendFor(a.mod) },
      x: { bg: a.accent, fg: legendFor(a.accent) },
    },
    selectedPreset: null,
  };
  if (apply.case) {
    patch.caseCustomColor = a.caseC;
    if (soft) patch.finish = 'softtouch';
  }
  if (apply.plate && a.plate) {
    patch.plateColor = a.plate;
  }
  if (apply.switch && a.switch) {
    patch.switchColor = a.switch;
  }
  if (apply.light) {
    patch.light = {
      color: a.glow,
      mode: state.light.mode === 'off' ? 'static' : state.light.mode,
      bright: state.light.bright,
    };
  }
  return patch;
}

/**
 * Single-part patch when a Customize toggle is turned on.
 * @param {'case'|'plate'|'light'|'switch'} part
 */
export function photoPartStatePatch(part) {
  const a = session?.assign;
  if (!a) return null;
  if (part === 'case') {
    const soft = lumaOfHex(a.caseC) < 0.45;
    return {
      caseCustomColor: a.caseC,
      ...(soft ? { finish: 'softtouch' } : {}),
      selectedPreset: null,
    };
  }
  if (part === 'plate') {
    return { plateColor: a.plate || a.mod, selectedPreset: null };
  }
  if (part === 'switch') {
    return { switchColor: a.switch || a.accent, selectedPreset: null };
  }
  if (part === 'light') {
    return {
      light: {
        color: a.glow,
        mode: state.light.mode === 'off' ? 'static' : state.light.mode,
        bright: state.light.bright,
      },
      selectedPreset: null,
    };
  }
  return null;
}

/**
 * Layout-normalised (u,v) for each key centre in current layout.
 */
export function layoutKeyUVs(layoutId) {
  const L = LAYOUTS[layoutId || state.layout];
  const rows = L.rows();
  const totalW = L.total;
  const totalH = rows.length;
  const out = [];
  rows.forEach((row, ri) => {
    let cur = 0;
    row.forEach((keyDef, ci) => {
      const start = keyDef.x !== undefined ? keyDef.x : cur;
      const kw = keyDef.w || 1;
      const cx = start + kw / 2;
      const cy = ri + 0.5;
      out.push({
        id: keyId(ri, ci),
        u: cx / totalW,
        v: cy / totalH,
        kw: kw / totalW,
        kh: 1 / totalH,
        label: keyDef.l,
      });
      cur = start + kw;
    });
  });
  return out;
}

/**
 * Copy colours from photo onto every key (or selected keys only).
 * Projective map + median window.
 * @param {{ autoLegend?: boolean, onlySelected?: boolean }} opts
 * @returns {number} keys updated
 */
export function copyColorsFromPhoto(opts = {}) {
  if (!session?.img) return 0;
  const { autoLegend = true, onlySelected = false } = opts;

  /* sample at a healthy working resolution (full image capped) */
  const maxDim = 960;
  const scl = Math.min(1, maxDim / Math.max(session.w, session.h));
  const tw = Math.max(1, Math.round(session.w * scl));
  const th = Math.max(1, Math.round(session.h * scl));
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(session.img, 0, 0, tw, th);
  const { data } = ctx.getImageData(0, 0, tw, th);

  const normQuad = session.corners.map((c) => [
    (c.x / session.w),
    (c.y / session.h),
  ]);
  const H = unitToQuad(normQuad);

  let keys = layoutKeyUVs(state.layout);
  if (onlySelected) {
    const sel = new Set(getSelectedIds());
    if (sel.size) keys = keys.filter((k) => sel.has(k.id));
  }

  let n = 0;
  for (const k of keys) {
    const [nx, ny] = mapH(H, k.u, k.v);
    const px = Math.round(nx * tw);
    const py = Math.round(ny * th);
    const du = (k.kw || 0.05) * 0.42;
    const dv = (k.kh || 0.1) * 0.42;
    const [ax, ay] = mapH(H, k.u - du, k.v);
    const [bx, by] = mapH(H, k.u + du, k.v);
    const [cxu, cyu] = mapH(H, k.u, k.v - dv);
    const [dxu, dyu] = mapH(H, k.u, k.v + dv);
    const kwpx = Math.hypot((bx - ax) * tw, (by - ay) * th);
    const khpx = Math.hypot((dxu - cxu) * tw, (dyu - cyu) * th);
    const rad = Math.max(2, Math.round(Math.min(kwpx, khpx) * 0.36));
    const [r, g, b] = sampleMedian(data, tw, th, px, py, rad);
    const patch = { bgColor: rgbHex(r, g, b) };
    if (autoLegend) patch.fgColor = autoFg(r, g, b);
    setOverride(k.id, patch);
    n++;
  }
  return n;
}

/** Data URL for UI preview */
export function photoPreviewUrl() {
  if (!session?.img) return '';
  const c = document.createElement('canvas');
  const max = 280;
  const scale = Math.min(1, max / session.w, max / session.h);
  c.width = Math.round(session.w * scale);
  c.height = Math.round(session.h * scale);
  const g = c.getContext('2d');
  g.drawImage(session.img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

/** Map session corners into preview pixel space */
export function cornersInPreview(previewW, previewH) {
  if (!session) return [];
  const sx = previewW / session.w;
  const sy = previewH / session.h;
  return session.corners.map((c) => ({ x: c.x * sx, y: c.y * sy }));
}

export function setCornerFromPreview(index, px, py, previewW, previewH) {
  if (!session || index < 0 || index > 3) return;
  session.corners[index] = {
    x: (px / previewW) * session.w,
    y: (py / previewH) * session.h,
  };
}
