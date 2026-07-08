import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { effectiveColorway } from '../core/update.js';
import {
  getEffectiveText, getEffectiveFg, getEffectiveBg, getEffectiveFontSize,
  hasGlow, hasImageBehindText, getEffectiveImage, keyId,
} from '../core/perKey.js';
import { exportKLE } from './kle.js';

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Map in-app legend font size (12–48, default 29) → SVG mm-ish text size. */
function fontSizeMm(fs) {
  const n = Number(fs);
  const v = Number.isFinite(n) ? n : 29;
  // 12 → ~3.2, 29 → ~6.2, 48 → ~9.5 (readable on 19.05mm unit keys)
  return Math.round((3.2 + ((v - 12) * (9.5 - 3.2)) / 36) * 100) / 100;
}

function legendTexts(x, y, w, h, label, fg, fs, glow) {
  const lines = String(label).split('\n').filter((l, i, a) => a.length > 1 || l.length >= 0);
  const size = fontSizeMm(fs);
  const lineH = size * 1.15;
  const blockH = lines.length * lineH;
  const startY = y + h / 2 - blockH / 2 + lineH * 0.72;
  const cx = x + w / 2;
  const style = glow
    ? `fill="none" stroke="${fg}" stroke-width="${Math.max(0.35, size * 0.06)}" paint-order="stroke"`
    : `fill="${fg}"`;
  return lines.map((line, i) => {
    const ty = startY + i * lineH;
    return `<text x="${cx}" y="${ty}" text-anchor="middle" font-size="${size}" ${style}>${escapeXml(line)}</text>`;
  }).join('');
}

export function generateSVG() {
  const L = LAYOUTS[state.layout];
  const rows = L.rows();
  const cw = effectiveColorway();
  const colorMap = { a: cw.a.bg, m: cw.m.bg, x: cw.x.bg };
  const fgColorMap = { a: cw.a.fg, m: cw.m.fg, x: cw.x.fg };

  const UNIT = 19.05;
  const GAP = 0.4;
  const KEY_H = UNIT - GAP;
  const K_R = 2;
  const PAD = 20;

  let maxW = 0, totalH = 0;
  rows.forEach((row) => {
    let rowW = 0;
    row.forEach((k) => {
      const start = k.x !== undefined ? k.x : rowW;
      rowW = start + (k.w || 1);
    });
    maxW = Math.max(maxW, rowW);
  });
  totalH = rows.length;

  const svgW = maxW * UNIT + PAD * 2;
  const svgH = totalH * UNIT + PAD * 2;

  const kleJson = exportKLE();

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}mm" height="${svgH}mm" viewBox="0 0 ${svgW} ${svgH}">
<metadata><![CDATA[${kleJson.replaceAll(']]>', ']]]]><![CDATA[>')}]]></metadata>
<rect width="${svgW}" height="${svgH}" fill="#ffffff"/>
<style>
  text { font-family: Inter, "Segoe UI", Arial, sans-serif; font-weight: 700; }
  .k { stroke: #ccc; stroke-width: 0.3; }
</style>
<g transform="translate(${PAD},${PAD})">`;

  rows.forEach((row, ri) => {
    let cur = 0;
    row.forEach((k, ci) => {
      const start = k.x !== undefined ? k.x : cur;
      const kw = k.w || 1;
      const x = start * UNIT + GAP / 2;
      const y = ri * UNIT + GAP / 2;
      const w = kw * UNIT - GAP;
      const h = KEY_H;
      const id = keyId(ri, ci);
      const defaultBg = colorMap[k.r] || colorMap.a;
      const defaultFg = fgColorMap[k.r] || fgColorMap.a;
      const bg = getEffectiveBg(id, defaultBg);
      const fg = getEffectiveFg(id, defaultFg) || defaultFg;
      const effectiveLabel = getEffectiveText(id, k.l);
      const effectiveFs = getEffectiveFontSize(id, 29);
      const glow = hasGlow(id);
      const img = getEffectiveImage(id);
      const imgBehind = hasImageBehindText(id);

      svg += `<rect class="k" x="${x}" y="${y}" width="${w}" height="${h}" rx="${K_R}" fill="${bg}" />`;

      /* Match 3D legendTex layering:
         - image only (no text) when image set and not imageBehindText
         - image under text when imageBehindText
         - text only otherwise */
      if (img && imgBehind) {
        svg += `<image x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h - 3}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(img)}" opacity="0.92"/>`;
        if (effectiveLabel) {
          svg += legendTexts(x, y, w, h, effectiveLabel, fg, effectiveFs, glow);
        }
      } else if (img && !imgBehind) {
        svg += `<image x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h - 3}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(img)}" opacity="1"/>`;
      } else if (effectiveLabel) {
        svg += legendTexts(x, y, w, h, effectiveLabel, fg, effectiveFs, glow);
      }

      cur = start + kw;
    });
  });

  svg += '\n</g>\n</svg>';
  return svg;
}

export function downloadSVG() {
  const svg = generateSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modkeys-${state.layout}-${state.customColors ? 'custom' : state.colorway}-template.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
