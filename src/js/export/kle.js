import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { PROFILES, PLATES, CASES, SWITCHES } from '../data/components.js';
import { effectiveColorway } from '../core/update.js';
import { getEffectiveText, getEffectiveFg, getEffectiveBg, getEffectiveFontSize, getOverride, keyId } from '../core/perKey.js';

const KLE_PROFILES = {
  cherry: 'Cherry',
  oem: 'OEM',
  xda: 'XDA',
  sa: 'SA',
  dsa: 'DSA',
  mt3: 'MT3',
  asa: 'ASA',
};

export function exportKLE() {
  const L = LAYOUTS[state.layout];
  const rows = L.rows();
  const cw = effectiveColorway();
  const profileName = KLE_PROFILES[state.profile] || state.profile;
  const cwName = state.customColors ? 'Custom' : (cw?.name || 'Custom');

  const meta = {
    name: `MODKEYS ${L.pct} — ${cwName}`,
    author: 'MODKEYS Configurator',
    notes: [
      `Switch: ${state.sw} ${state.switchColor || SWITCHES[state.sw]?.dot || ''}`.trim(),
      `Plate: ${state.plate} ${state.plateColor || PLATES[state.plate]?.c || ''}`.trim(),
      `Case: ${state.caseColor} ${state.caseCustomColor || CASES[state.caseColor]?.c || ''}`.trim(),
      `Finish: ${state.finish}`,
      `Material: ${state.material}`,
      `Profile: ${profileName}`,
      `Light: ${state.light.mode} ${state.light.color} @${state.light.bright}`,
      'Per-key: c/t/f from overrides (font 12–48 → f 1–9)',
    ].join(' | '),
  };

  const kleData = [meta];

  rows.forEach((row, ri) => {
    const kleRow = [];
    let curX = 0;
    let currentProps = {};

    function emitProps(nextProps) {
      const changed = {};
      let hasChange = false;
      if (nextProps.c !== undefined && nextProps.c !== currentProps.c) {
        changed.c = nextProps.c; hasChange = true;
      }
      if (nextProps.t !== undefined && nextProps.t !== currentProps.t) {
        changed.t = nextProps.t; hasChange = true;
      }
      if (nextProps.f !== undefined && nextProps.f !== currentProps.f) {
        changed.f = nextProps.f; hasChange = true;
      }
      if (nextProps.x !== undefined) {
        changed.x = nextProps.x; hasChange = true;
      }
      if (nextProps.w !== undefined) {
        changed.w = nextProps.w; hasChange = true;
      }
      if (nextProps.n !== undefined) {
        changed.n = nextProps.n; hasChange = true;
      }
      if (hasChange) {
        kleRow.push(changed);
        Object.assign(currentProps, changed);
      }
      return changed;
    }

    row.forEach((keyDef, ci) => {
      const start = keyDef.x !== undefined ? keyDef.x : curX;
      const id = keyId(ri, ci);
      const ov = getOverride(id);
      const defaultBg = cw[keyDef.r]?.bg || cw.a?.bg || '#cccccc';
      const defaultFg = cw[keyDef.r]?.fg || cw.a?.fg || '#000000';
      const bgColor = getEffectiveBg(id, defaultBg);
      const fgColor = getEffectiveFg(id, defaultFg) || defaultFg;
      const effectiveLabel = getEffectiveText(id, keyDef.l);
      const effectiveFs = getEffectiveFontSize(id, 29);
      const kw = keyDef.w || 1;
      const gap = start - curX;

      // Map font size 12-48 -> KLE scale 1-9
      const kleFs = Math.min(9, Math.max(1, Math.round(1 + (effectiveFs - 12) * 8 / 36)));

      const nextProps = {
        c: bgColor,
        t: fgColor,
        f: kleFs,
      };
      if (gap > 0) nextProps.x = gap;
      if (kw !== 1) nextProps.w = kw;
      // n: true only for actual homing keys F and J
      const isHome = effectiveLabel === 'F' || effectiveLabel === 'J';
      if (isHome) nextProps.n = true;

      emitProps(nextProps);
      kleRow.push(effectiveLabel ?? '');
      curX = start + kw;
    });

    // Reset per-row tracking
    currentProps = {};
    kleData.push(kleRow);
  });

  return JSON.stringify(kleData, null, 2);
}

export function validateKLE(json) {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data) || data.length < 2) return false;
    const rows = data.slice(1);
    let totalStrings = 0;
    let lastWasObj = false;
    for (const row of rows) {
      if (!Array.isArray(row)) return false;
      lastWasObj = false;
      for (const el of row) {
        if (typeof el === 'object' && el !== null) {
          lastWasObj = true;
        } else if (typeof el === 'string') {
          totalStrings++;
          lastWasObj = false;
        } else {
          return false;
        }
      }
      if (lastWasObj) return false;
    }
    const L = LAYOUTS[state.layout];
    const expectedKeys = L.rows().reduce((sum, r) => sum + r.length, 0);
    return totalStrings === expectedKeys;
  } catch {
    return false;
  }
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
