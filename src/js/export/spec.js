import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, EXTRAS, PROFILES } from '../data/components.js';
import { exportKLE } from './kle.js';

export function generateSpec() {
  const L = LAYOUTS[state.layout];
  const cw = COLORWAYS[state.colorway];
  const sw = SWITCHES[state.sw];
  const totalKeys = L.rows().reduce((sum, row) => sum + row.length, 0);

  const spec = {
    name: `MODKEYS ${L.pct}`,
    colorway: cw.name,
    generated: new Date().toISOString(),
    version: '1.0',

    layout: {
      name: L.name,
      size: L.pct,
      totalKeys,
      keySpacing: '19.05mm',
      stabilizers: [
        { size: '6.25U', qty: 1, position: 'Spacebar' },
        { size: '2U', qty: 4, position: 'Shift, Enter, Backspace' },
      ],
    },

    keycaps: {
      profile: PROFILES[state.profile].name,
      material: MATERIALS[state.material].name,
      legendMethod: 'Doubleshot injection',
      colorway: {
        alpha: { bg: cw.a.bg, fg: cw.a.fg },
        modifier: { bg: cw.m.bg, fg: cw.m.fg },
        accent: { bg: cw.x.bg, fg: cw.x.fg },
      },
    },

    case: {
      color: CASES[state.caseColor].name,
      colorHex: CASES[state.caseColor].c,
      finish: FINISHES[state.finish].name,
      suggestedMaterial: 'Aluminum (CNC)',
    },

    plate: {
      material: PLATES[state.plate].name,
      thickness: '1.5mm',
    },

    switches: {
      name: sw.name,
      type: sw.type,
      force: sw.force,
      mount: 'Cherry MX',
      quantity: totalKeys,
    },

    accessories: Object.entries(EXTRAS)
      .filter(([id]) => state.extras[id])
      .map(([, e]) => e.name),

    lighting: {
      mode: state.light.mode,
      type: 'South-facing SMD RGB',
      supported: true,
    },

    manufacturing: {
      pcbStandard: 'GH60 compatible',
      usbType: 'USB-C',
      dimensions: '285mm x 95mm (standard)',
      notes: 'All measurements nominal. Verify with manufacturer before production.',
    },

    kleData: exportKLE(),
  };

  return JSON.stringify(spec, null, 2);
}

export function downloadSpec() {
  const json = generateSpec();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modkeys-${state.layout}-${state.colorway}-spec.json`;
  a.click();
  URL.revokeObjectURL(url);
}
