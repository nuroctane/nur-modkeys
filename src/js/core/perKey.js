import { state } from './state.js';

/** Stable perKeyOverrides id for the rotary knob (not a layout row-col). */
export const KNOB_ID = 'knob';

export function isKnobId(id) {
  return id === KNOB_ID;
}

export function keyId(row, col) {
  return row + '-' + col;
}

function store() {
  return state.perKeyOverrides;
}

export function setOverride(id, patch) {
  const cur = store()[id] || {};
  Object.assign(cur, patch);
  /* clean null fields */
  if (patch.imageData === null) delete cur.imageData;
  if (patch.bgColor === null) delete cur.bgColor;
  if (patch.fgColor === null) delete cur.fgColor;
  if (patch.markId === null) delete cur.markId;
  store()[id] = cur;
}

export function clearOverride(id) {
  delete store()[id];
}

export function clearAllOverrides() {
  Object.keys(store()).forEach((k) => delete store()[k]);
}

/**
 * Strip per-key face/legend colours so global colorway / customColors can show.
 * Keeps images, emoji, custom text, glow, font size, fit, etc.
 * @returns {boolean} true if anything was removed
 */
export function clearPerKeyCapColors() {
  const map = store();
  let changed = false;
  Object.keys(map).forEach((id) => {
    const o = map[id];
    if (!o) return;
    if (o.bgColor !== undefined) { delete o.bgColor; changed = true; }
    if (o.fgColor !== undefined) { delete o.fgColor; changed = true; }
    if (!Object.keys(o).length) delete map[id];
  });
  return changed;
}

export function getOverride(id) {
  return store()[id] || null;
}

/** Apply same patch to many keys (multi-select). */
export function setOverrides(ids, patch) {
  (ids || []).forEach((id) => setOverride(id, patch));
}

export function getEffectiveText(id, defaultLabel) {
  const o = store()[id];
  if (o && o.labelHidden) return '';
  return (o && o.customText !== undefined) ? o.customText : defaultLabel;
}

export function hasCustomText(id) {
  const o = store()[id];
  return !!(o && o.customText !== undefined);
}

export function isLabelHidden(id) {
  const o = store()[id];
  return !!(o && o.labelHidden);
}

export function getEffectiveFg(id, defaultFg) {
  const o = store()[id];
  if (o && o.glow) return null;
  if (o && o.fgColor) return o.fgColor;
  return defaultFg;
}

export function getEffectiveBg(id, defaultBg) {
  const o = store()[id];
  return (o && o.bgColor) ? o.bgColor : defaultBg;
}

export function getEffectiveMark(id, defaultMark) {
  const o = store()[id];
  return (o && o.markId !== undefined) ? o.markId : defaultMark;
}

export function getEffectiveImage(id) {
  const o = store()[id];
  return (o && o.imageData) ? o.imageData : null;
}

/** wrap | fill | sticker — default fill when imageBehindText legacy true, else wrap for full image */
export function getImageFit(id) {
  const o = store()[id];
  if (!o) return 'wrap';
  if (o.imageFit) return o.imageFit;
  if (o.imageBehindText) return 'fill';
  return 'wrap';
}

export function getEffectiveFontSize(id, defaultSize) {
  const o = store()[id];
  if (!o || o.fontSize == null || o.fontSize === '') return defaultSize;
  const n = Number(o.fontSize);
  return Number.isFinite(n) ? n : defaultSize;
}

export function hasGlow(id) {
  const o = store()[id];
  return o && o.glow === true;
}

export function hasImageBehindText(id) {
  const o = store()[id];
  if (o && o.imageFit === 'fill') return true;
  if (o && (o.imageFit === 'wrap' || o.imageFit === 'sticker')) return false;
  return o && o.imageBehindText === true;
}

export function getAllEntries() {
  return Object.entries(store());
}

/* ── selection helpers ─────────────────────────────────────────── */

export function getSelectedIds() {
  if (!Array.isArray(state.selectedKeys)) state.selectedKeys = [];
  return state.selectedKeys;
}

export function setSelectedIds(ids) {
  state.selectedKeys = [...new Set(ids || [])];
  state.selectedKey = state.selectedKeys.length ? state.selectedKeys[state.selectedKeys.length - 1] : null;
}

export function clearSelection() {
  state.selectedKeys = [];
  state.selectedKey = null;
}

export function selectKey(id, { multi = false } = {}) {
  if (!id) return getSelectedIds();
  if (!Array.isArray(state.selectedKeys)) state.selectedKeys = [];
  if (multi) {
    const i = state.selectedKeys.indexOf(id);
    if (i >= 0) state.selectedKeys.splice(i, 1);
    else state.selectedKeys.push(id);
  } else {
    state.selectedKeys = [id];
  }
  state.selectedKey = state.selectedKeys.length
    ? state.selectedKeys[state.selectedKeys.length - 1]
    : null;
  return state.selectedKeys;
}
