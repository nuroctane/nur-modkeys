import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, EXTRAS } from '../data/components.js';
import { effectiveColorway } from '../core/update.js';
import { getOverride, getAllEntries, keyId } from '../core/perKey.js';
import { exportKLE } from './kle.js';

export function generateSpec() {
  const L = LAYOUTS[state.layout];
  const cw = effectiveColorway();
  const cwName = state.customColors ? 'Custom' : COLORWAYS[state.colorway].name;
  const countKeys = L.rows().reduce((sum, r) => sum + r.length, 0);

  const perKeyInfo = [];
  getAllEntries().forEach(([id, ov]) => {
    perKeyInfo.push({
      key: id,
      customText: ov.customText || undefined,
      fgColor: ov.fgColor || undefined,
      bgColor: ov.bgColor || undefined,
      glow: ov.glow || undefined,
      hasImage: !!ov.imageData,
      imageBehindText: ov.imageBehindText || undefined,
      fontSize: ov.fontSize || undefined,
    });
  });

  const spec = {
    name: `MODKEYS ${L.pct} — ${cwName}`,
    generated: new Date().toISOString(),
    configurator: 'MODKEYS by nur',

    layout: {
      name: L.name,
      size: L.pct,
      totalKeys: countKeys,
      spacing: '19.05mm standard',
      stabilizers: '6.25U space x1, 2U x4',
    },

    keycaps: {
      profile: state.profile.toUpperCase(),
      material: MATERIALS[state.material].name,
      legendMethod: 'Doubleshot injection',
      colorway: {
        name: cwName,
        alpha: { bg: cw.a.bg, fg: cw.a.fg },
        mod: { bg: cw.m.bg, fg: cw.m.fg },
        accent: { bg: cw.x.bg, fg: cw.x.fg },
      },
      customKeys: perKeyInfo.length > 0 ? perKeyInfo : undefined,
    },

    case: {
      color: CASES[state.caseColor].name,
      hex: CASES[state.caseColor].c,
      finish: FINISHES[state.finish].name,
      suggestedMaterial: 'Aluminum CNC',
    },

    plate: {
      material: PLATES[state.plate].name,
      thickness: '1.5mm',
    },

    switches: {
      name: SWITCHES[state.sw].name,
      type: SWITCHES[state.sw].type,
      force: SWITCHES[state.sw].force,
      mount: 'Cherry MX',
      quantity: countKeys,
    },

    accessories: Object.entries(state.extras)
      .filter(([, v]) => v)
      .map(([id]) => EXTRAS[id].name),

    lighting: {
      mode: state.light.mode,
      type: 'South-facing SMD RGB',
      supported: true,
    },

    manufacturing: {
      pcb: 'GH60 compatible',
      usb: 'USB-C',
      dimensions: `${Math.round(L.total * 19.05)}mm x 95mm`,
      notes: 'Custom image keys require dye-sublimation or UV printing (not doubleshot).',
    },

    kleLayout: exportKLE(),
  };

  return JSON.stringify(spec, null, 2);
}

export function downloadSpec() {
  const json = generateSpec();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modkeys-${state.layout}-${state.customColors ? 'custom' : state.colorway}-spec.json`;
  a.click();
  URL.revokeObjectURL(url);
}
