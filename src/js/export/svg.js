import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';

export function generateSVG() {
  const L = LAYOUTS[state.layout];
  const rows = L.rows();
  const cw = COLORWAYS[state.colorway];
  const colorMap = { a: cw.a.bg, m: cw.m.bg, x: cw.x.bg };
  const fgColorMap = { a: cw.a.fg, m: cw.m.fg, x: cw.x.fg };

  const UNIT = 19.05; // mm per key unit
  const GAP = 0.4; // mm gap between keys
  const KEY_W = UNIT - GAP;
  const KEY_H = UNIT - GAP;
  const K_R = 2; // corner radius
  const PAD = 20;

  /* calculate dimensions */
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

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
<rect width="${svgW}" height="${svgH}" fill="#ffffff"/>
<style>
  text { font-family: "Inter","Segoe UI",Arial,sans-serif; font-weight: 600; fill: #000; }
  .k { stroke: #ccc; stroke-width: 0.3; }
</style>
<g transform="translate(${PAD},${PAD})">`;

  rows.forEach((row, ri) => {
    let cur = 0;
    row.forEach((k) => {
      const start = k.x !== undefined ? k.x : cur;
      const kw = k.w || 1;
      const x = start * UNIT + GAP / 2;
      const y = ri * UNIT + GAP / 2;
      const w = kw * UNIT - GAP;
      const h = KEY_H;
      const bg = colorMap[k.r] || colorMap.a;
      const fg = fgColorMap[k.r] || fgColorMap.a;

      svg += `<rect class="k" x="${x}" y="${y}" width="${w}" height="${h}" rx="${K_R}" fill="${bg}" />`;
      if (k.l) {
        const lines = k.l.split('\n');
        svg += `<text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="${fg}">${lines.map(l => escapeXml(l)).join('</text><text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 3) + '" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="' + fg + '">')}</text>`;
      }
      cur = start + kw;
    });
  });

  svg += '\n</g>\n</svg>';
  return svg;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function downloadSVG() {
  const svg = generateSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modkeys-${state.layout}-${state.colorway}-template.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
