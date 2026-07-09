/**
 * Photo → board color sampling.
 * Maps a photo (keyboard dye-sub or art) onto the current layout via a
 * 4-corner quad in image space; each key samples a local average RGB.
 */
import { LAYOUTS } from '../data/layouts.js';
import { state } from './state.js';
import { keyId, setOverride, setOverrides, getSelectedIds } from './perKey.js';

/** @type {{ img: HTMLImageElement, corners: {x:number,y:number}[], w: number, h: number } | null} */
let session = null;

export function getPhotoSession() {
  return session;
}

export function clearPhotoSession() {
  session = null;
}

export function hasPhotoSession() {
  return !!(session && session.img);
}

/** Load File/Blob into session with default full-image corners. */
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
        corners: [
          { x: w * 0.08, y: h * 0.12 },
          { x: w * 0.92, y: h * 0.12 },
          { x: w * 0.92, y: h * 0.88 },
          { x: w * 0.08, y: h * 0.88 },
        ],
      };
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Bilinear map (u,v) in [0,1]² through quad corners TL,TR,BR,BL */
function sampleQuad(corners, u, v) {
  const [tl, tr, br, bl] = corners;
  const topX = lerp(tl.x, tr.x, u);
  const topY = lerp(tl.y, tr.y, u);
  const botX = lerp(bl.x, br.x, u);
  const botY = lerp(bl.y, br.y, u);
  return { x: lerp(topX, botX, v), y: lerp(topY, botY, v) };
}

function rgbToHex(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

function autoFg(r, g, b) {
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#1a1a1a' : '#f4f4f4';
}

/**
 * Layout-normalized (u,v) for each key center in current layout.
 * u left→right, v top→bottom.
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
        label: keyDef.l,
      });
      cur = start + kw;
    });
  });
  return out;
}

/**
 * Sample average color from image around (px,py).
 */
function sampleAvg(ctx, px, py, radius = 4) {
  const x0 = Math.max(0, Math.floor(px - radius));
  const y0 = Math.max(0, Math.floor(py - radius));
  const x1 = Math.min(ctx.canvas.width - 1, Math.ceil(px + radius));
  const y1 = Math.min(ctx.canvas.height - 1, Math.ceil(py + radius));
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  if (w <= 0 || h <= 0) return { r: 128, g: 128, b: 128 };
  const data = ctx.getImageData(x0, y0, w, h).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (!n) return { r: 128, g: 128, b: 128 };
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

/**
 * Copy colors from photo onto every key (or selected keys only).
 * @param {{ autoLegend?: boolean, onlySelected?: boolean }} opts
 * @returns {number} keys updated
 */
export function copyColorsFromPhoto(opts = {}) {
  if (!session?.img) return 0;
  const { autoLegend = true, onlySelected = false } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = session.w;
  canvas.height = session.h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(session.img, 0, 0);

  let keys = layoutKeyUVs(state.layout);
  if (onlySelected) {
    const sel = new Set(getSelectedIds());
    if (sel.size) keys = keys.filter((k) => sel.has(k.id));
  }

  let n = 0;
  for (const k of keys) {
    const pt = sampleQuad(session.corners, k.u, k.v);
    const { r, g, b } = sampleAvg(ctx, pt.x, pt.y, 5);
    const patch = { bgColor: rgbToHex(r, g, b) };
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
