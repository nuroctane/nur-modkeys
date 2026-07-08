import { state } from './state.js';

export function keyId(row, col) {
  return row + '-' + col;
}

function store() {
  return state.perKeyOverrides;
}

export function setOverride(id, patch) {
  const cur = store()[id] || {};
  Object.assign(cur, patch);
  store()[id] = cur;
}

export function clearOverride(id) {
  delete store()[id];
}

export function clearAllOverrides() {
  Object.keys(store()).forEach(k => delete store()[k]);
}

export function getOverride(id) {
  return store()[id] || null;
}

export function getEffectiveText(id, defaultLabel) {
  const o = store()[id];
  return (o && o.customText !== undefined) ? o.customText : defaultLabel;
}

export function hasCustomText(id) {
  const o = store()[id];
  return !!(o && o.customText !== undefined);
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
  return o && o.imageBehindText === true;
}

export function getAllEntries() {
  return Object.entries(store());
}
