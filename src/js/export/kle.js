import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { SWITCHES } from '../data/components.js';
import { effectiveColorway } from '../core/update.js';
import { getEffectiveText, getEffectiveFg, getEffectiveBg, getOverride, keyId } from '../core/perKey.js';

export function exportKLE() {
  const L = LAYOUTS[state.layout];
  const rows = L.rows();
  const cw = effectiveColorway();
  const colorMap = { a: cw.a.bg, m: cw.m.bg, x: cw.x.bg };

  const kleData = [
    {
      name: `MODKEYS ${L.pct} — ${state.customColors ? 'Custom' : COLORWAYS[state.colorway].name}`,
      author: 'MODKEYS Configurator',
      switchMount: 'cherry',
      switchBrand: 'cherry',
      switchType: SWITCHES[state.sw].name,
    },
  ];

  rows.forEach((row, ri) => {
    const kleRow = [];
    let cur = 0;
    row.forEach((keyDef, ci) => {
      const start = keyDef.x !== undefined ? keyDef.x : cur;
      if (start > cur) {
        kleRow.push({ x: start - cur });
      }
      const id = keyId(ri, ci);
      const ov = getOverride(id);
      const customBg = (ov && ov.bgColor) ? ov.bgColor : null;
      const entry = {
        x: 0,
        y: 0,
        w: keyDef.w || 1,
        h: 1,
        c: customBg || colorMap[keyDef.r] || colorMap.a,
        t: '#000000',
      };
      const effectiveLabel = getEffectiveText(id, keyDef.l);
      if (effectiveLabel) {
        entry.l = effectiveLabel;
      }
      if (ov) {
        entry.n = true;
        if (ov.fgColor) entry.t = ov.fgColor;
        if (ov.glow) entry.note = 'glow';
        if (ov.imageData) entry.note = (entry.note ? entry.note + ', ' : '') + 'custom image';
      }
      kleRow.push(entry);
      cur = start + (keyDef.w || 1);
    });
    kleData.push(kleRow);
  });

  return JSON.stringify(kleData, null, 2);
}

export function downloadKLE() {
  const json = exportKLE();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modkeys-${state.layout}-${state.customColors ? 'custom' : state.colorway}-layout.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyKLE() {
  navigator.clipboard.writeText(exportKLE());
}
