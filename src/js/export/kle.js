import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { SWITCHES } from '../data/components.js';

export function exportKLE() {
  const L = LAYOUTS[state.layout];
  const rows = L.rows();
  const cw = COLORWAYS[state.colorway];
  const colorMap = { a: cw.a.bg, m: cw.m.bg, x: cw.x.bg };

  const kleData = [
    {
      name: `MODKEYS ${L.pct} — ${cw.name}`,
      author: 'MODKEYS Configurator',
      switchMount: 'cherry',
      switchBrand: 'cherry',
      switchType: SWITCHES[state.sw].name,
    },
  ];

  rows.forEach((row) => {
    const kleRow = [];
    let cur = 0;
    row.forEach((keyDef) => {
      const start = keyDef.x !== undefined ? keyDef.x : cur;
      if (start > cur) {
        kleRow.push({ x: start - cur });
      }
      const entry = {
        x: 0,
        y: 0,
        w: keyDef.w || 1,
        h: 1,
        c: colorMap[keyDef.r] || colorMap.a,
        t: keyDef.r === 'x' ? '#ffffff' : '#000000',
      };
      if (keyDef.l) {
        entry.l = keyDef.l;
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
  a.download = `modkeys-${state.layout}-${state.colorway}-layout.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyKLE() {
  navigator.clipboard.writeText(exportKLE());
}
