import * as THREE from 'three';
import gsap from 'gsap';
import { state, stateSlice } from './state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, PROFILES, GAP } from '../data/components.js';
import {
  renderer, scene, camera, root, caseGroup, capsGroup, knobGroup, cableGroup, wristGroup,
  matAlpha, matMod, matAccent, matCase, matPlate, matStem,
  capMats, applyPlateFinish, applyCapMaterial, uni, sRGB,
} from './scene.js';
import { rebuildBoard, buildKeys, refreshLegends, preloadEmoji } from './keyboard.js';
import { setView } from './controls.js';
import { pushState, undo as undoHistory, redo as redoHistory } from './history.js';

/* Panel re-render hook. panels.js statically imports this module, so a static
   import back would be circular; app.js (which imports both) registers the
   real renderPanel here at boot. Replaces a mixed dynamic/static import that
   tripped a Vite chunking warning. */
let panelRenderHook = null;
export function onPanelRender(fn) { panelRenderHook = fn; }


let _syncUI = null;
const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function registerSyncUI(fn) {
  _syncUI = fn;
}

const modes = { wave: 0, static: 1, breathe: 2, off: 3 };

export function effectiveColorway() {
  if (state.customColors) {
    return {
      a: { bg: state.customColors.a.bg, fg: state.customColors.a.fg },
      m: { bg: state.customColors.m.bg, fg: state.customColors.m.fg },
      x: { bg: state.customColors.x.bg, fg: state.customColors.x.fg },
    };
  }
  return COLORWAYS[state.colorway];
}

export function applyLight() {
  uni.uMode.value = modes[state.light.mode] || 3;
  uni.uColor.value.set(state.light.color);
  uni.uBright.value = state.light.bright;
  const on = state.light.mode !== 'off';
  caseGroup.children.forEach((c) => {
    if (c.material && c.material !== matCase && c.material !== matPlate)
      c.visible = on;
  });
}

function applyColors(cw) {
  matAlpha.color.copy(sRGB(cw.a.bg));
  matMod.color.copy(sRGB(cw.m.bg));
  matAccent.color.copy(sRGB(cw.x.bg));
}

function applyInstant(s) {
  if (s.brand !== undefined) state.brand = s.brand;
  if (s.colorway && COLORWAYS[s.colorway]) {
    applyColors(COLORWAYS[s.colorway]);
    state.colorway = s.colorway;
    state.customColors = null;
    refreshLegends();
    if (panelRenderHook) panelRenderHook(state.section);
  } else if (s.customColors) {
    applyColors(s.customColors);
    state.customColors = s.customColors;
    refreshLegends();
  } else if (s.brand !== undefined) {
    refreshLegends();
  }
  if (s.caseColor) {
    state.caseColor = s.caseColor;
    if (s.caseCustomColor === undefined) state.caseCustomColor = null;
  }
  if (s.caseCustomColor !== undefined) {
    state.caseCustomColor = s.caseCustomColor;
  }
  if (s.caseColor || s.caseCustomColor !== undefined) {
    const cHex = state.caseCustomColor || CASES[state.caseColor].c;
    matCase.color.copy(sRGB(cHex));
  }
  if (s.finish) {
    const f = FINISHES[s.finish];
    matCase.metalness = f.metal;
    matCase.roughness = f.rough;
    matCase.clearcoat = f.cc;
    state.finish = s.finish;
  }
  if (s.plate) {
    state.plate = s.plate;
    /* switching material type resets tint to that plate's default unless plateColor also provided */
    if (s.plateColor === undefined) state.plateColor = null;
  }
  if (s.plateColor !== undefined) {
    state.plateColor = s.plateColor;
  }
  if (s.plate || s.plateColor !== undefined) {
    applyPlateFinish(state.plate, state.plateColor || PLATES[state.plate].c);
  }
  if (s.sw) {
    state.sw = s.sw;
    if (s.switchColor === undefined) state.switchColor = null;
  }
  if (s.switchColor !== undefined) {
    state.switchColor = s.switchColor;
  }
  if (s.sw || s.switchColor !== undefined) {
    const sHex = state.switchColor || SWITCHES[state.sw].dot;
    matStem.color.copy(sRGB(sHex));
  }
  if (s.material) {
    applyCapMaterial(s.material);
    state.material = s.material;
  }
  if (s.light) {
    state.light = Object.assign({}, state.light, s.light);
    applyLight();
  }
  if (s.extras) {
    state.extras = Object.assign({}, state.extras, s.extras);
    knobGroup.visible = LAYOUTS[state.layout].knob && state.extras.knob;
    cableGroup.visible = state.extras.cable;
    wristGroup.visible = state.extras.wrist;
  }
  if (s.perKeyOverrides) {
    state.perKeyOverrides = s.perKeyOverrides;
    refreshLegends();
  }
}

function popKeys() {
  capsGroup.children.forEach((c) => {
    gsap.from(c.position, {
      y: c.userData.baseY + 0.5,
      duration: 0.6,
      ease: 'power3.out',
      delay: c.userData.col * 0.008 + c.userData.row * 0.03,
      overwrite: 'auto',
    });
  });
}

function tweenColor(mat, hex, d) {
  if (RM()) { mat.color.copy(sRGB(hex)); return; }
  const c = sRGB(hex);
  gsap.to(mat.color, {
    r: c.r, g: c.g, b: c.b,
    duration: d || 0.55,
    ease: 'power2.out',
    overwrite: 'auto',
  });
}

function apply3D(patch, animate) {
  if (!animate || RM()) {
    applyInstant(patch);
    if (patch.layout) { state.layout = patch.layout; rebuildBoard(); }
    if (patch.profile) { state.profile = patch.profile; buildKeys(); }
    return;
  }
  if (patch.colorway && COLORWAYS[patch.colorway]) {
    const cw = COLORWAYS[patch.colorway];
    tweenColor(matAlpha, cw.a.bg);
    tweenColor(matMod, cw.m.bg);
    tweenColor(matAccent, cw.x.bg);
    state.customColors = null;
    gsap.delayedCall(0.26, refreshLegends);
  }
  if (patch.customColors) {
    tweenColor(matAlpha, patch.customColors.a.bg);
    tweenColor(matMod, patch.customColors.m.bg);
    tweenColor(matAccent, patch.customColors.x.bg);
    gsap.delayedCall(0.26, refreshLegends);
  }
  if (patch.caseColor) {
    if (patch.caseCustomColor === undefined) state.caseCustomColor = null;
    const cHex = state.caseCustomColor || CASES[patch.caseColor].c;
    tweenColor(matCase, cHex);
  }
  if (patch.caseCustomColor !== undefined && !patch.caseColor) {
    const cHex = patch.caseCustomColor || CASES[state.caseColor].c;
    tweenColor(matCase, cHex);
  }
  if (patch.finish) {
    const f = FINISHES[patch.finish];
    gsap.to(matCase, { metalness: f.metal, roughness: f.rough, clearcoat: f.cc, duration: 0.5 });
  }
  if (patch.plate) {
    if (patch.plateColor === undefined) state.plateColor = null;
    const hex = state.plateColor || PLATES[patch.plate].c;
    tweenColor(matPlate, hex);
    applyPlateFinish(patch.plate, hex);
  }
  if (patch.plateColor !== undefined && !patch.plate) {
    const hex = patch.plateColor || PLATES[state.plate].c;
    tweenColor(matPlate, hex);
    applyPlateFinish(state.plate, hex);
  }
  if (patch.sw) {
    if (patch.switchColor === undefined) state.switchColor = null;
    const sHex = state.switchColor || SWITCHES[patch.sw].dot;
    tweenColor(matStem, sHex, 0.4);
  }
  if (patch.switchColor !== undefined && !patch.sw) {
    const sHex = patch.switchColor || SWITCHES[state.sw].dot;
    tweenColor(matStem, sHex, 0.4);
  }
  if (patch.material) {
    applyCapMaterial(patch.material);
  }
  if (patch.light) applyLight();
  if (patch.extras !== undefined) {
    knobGroup.visible = LAYOUTS[state.layout].knob && state.extras.knob;
    cableGroup.visible = state.extras.cable;
    wristGroup.visible = state.extras.wrist;
  }
  if (patch.profile) { buildKeys(); popKeys(); }
  if (patch.layout) {
    if (state.exploded) setView('3d');
    rebuildBoard();
    popKeys();
  }
  if (patch.perKeyOverrides) {
    state.perKeyOverrides = patch.perKeyOverrides;
    refreshLegends();
  }
}

export function setState(patch, opts) {
  opts = opts || {};
  if (patch.light) patch.light = Object.assign({}, state.light, patch.light);
  if (patch.extras) patch.extras = Object.assign({}, state.extras, patch.extras);
  pushState(stateSlice());
  Object.assign(state, patch);
  apply3D(patch, opts.animate !== false);
  if (_syncUI) _syncUI(opts.skipPanel);
}

export function undo() {
  const snap = undoHistory();
  if (!snap) return false;
  Object.assign(state, snap);
  applyInstant(snap);
  if (snap.layout) rebuildBoard();
  if (snap.profile) buildKeys();
  if (_syncUI) _syncUI();
  return true;
}

export function redo() {
  const snap = redoHistory();
  if (!snap) return false;
  Object.assign(state, snap);
  applyInstant(snap);
  if (snap.layout) rebuildBoard();
  if (snap.profile) buildKeys();
  if (_syncUI) _syncUI();
  return true;
}
