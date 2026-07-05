import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { effectiveColorway } from '../core/update.js';
import { getEffectiveText, getEffectiveFg, getEffectiveBg, getOverride, keyId } from '../core/perKey.js';

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateSVG() {
  const L = LAYOUTS[state.layout];
  const rows = L.rows();
  const cw = effectiveColorway();
  const colorMap = { a: cw.a.bg, m: cw.m.bg, x: cw.x.bg };
  const fgColorMap = { a: cw.a.fg, m: cw.m.fg, x: cw.x.fg };

  const UNIT = 19.05;
  const GAP = 0.4;
  const KEY_W = UNIT - GAP;
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

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
<rect width="${svgW}" height="${svgH}" fill="#ffffff"/>
<style>
  text { font-family: "Inter","Segoe UI",Arial,sans-serif; font-weight: 600; fill: #000; }
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
      const ov = getOverride(id);
      const bg = (ov && ov.bgColor) ? ov.bgColor : (colorMap[k.r] || colorMap.a);
      const fg = (ov && ov.fgColor) ? ov.fgColor : (fgColorMap[k.r] || fgColorMap.a);

      svg += `<rect class="k" x="${x}" y="${y}" width="${w}" height="${h}" rx="${K_R}" fill="${bg}" />`;
      const effectiveLabel = getEffectiveText(id, k.l);
      if (effectiveLabel) {
        const lines = effectiveLabel.split('\n');
        const fgStyle = ov && ov.glow ? `stroke="${fg}" stroke-width="0.5" fill="none"` : `fill="${fg}"`;
        svg += `<text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle" dominant-baseline="middle" font-size="7" ${fgStyle}>${lines.map(l => escapeXml(l)).join('</text><text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 3) + '" text-anchor="middle" dominant-baseline="middle" font-size="7" ' + fgStyle + '>')}</text>`;
      }
      if (ov && ov.imageData) {
        svg += `<image x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(ov.imageData)}" opacity="0.3"/>`;
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
