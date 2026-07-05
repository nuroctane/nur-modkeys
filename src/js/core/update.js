import * as THREE from 'three';
import { state, stateSlice } from './state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, PROFILES, GAP } from '../data/components.js';
import {
  renderer, scene, camera, root, caseGroup, capsGroup, knobGroup,
  matAlpha, matMod, matAccent, matCase, matPlate, matStem,
  capMats, applyPlateFinish, uni, sRGB,
} from './scene.js';
import { rebuildBoard, buildKeys, refreshLegends, preloadEmoji } from './keyboard.js';
import { setView } from './controls.js';
import { pushState, undo as undoHistory, redo as redoHistory } from './history.js';

let _syncUI = null;

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

function applyLight() {
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
  if (s.colorway) {
    applyColors(COLORWAYS[s.colorway]);
    state.colorway = s.colorway;
    state.customColors = null;
    refreshLegends();
    import('../ui/panels.js').then(m => m.renderPanel(state.section));
  } else if (s.customColors) {
    applyColors(s.customColors);
    state.customColors = s.customColors;
    refreshLegends();
  } else if (s.brand !== undefined) {
    refreshLegends();
  }
  if (s.caseColor) {
    matCase.color.copy(sRGB(CASES[s.caseColor].c));
    state.caseColor = s.caseColor;
  }
  if (s.finish) {
    const f = FINISHES[s.finish];
    matCase.metalness = f.metal;
    matCase.roughness = f.rough;
    matCase.clearcoat = f.cc;
    state.finish = s.finish;
  }
  if (s.plate) {
    matPlate.color.copy(sRGB(PLATES[s.plate].c));
    applyPlateFinish(s.plate);
    state.plate = s.plate;
  }
  if (s.sw) {
    matStem.color.copy(sRGB(SWITCHES[s.sw].dot));
    state.sw = s.sw;
  }
  if (s.material) {
    const m = MATERIALS[s.material];
    [matAlpha, matMod, matAccent].forEach((mm) => {
      mm.roughness = m.rough;
      mm.clearcoat = m.cc;
      mm.clearcoatRoughness = m.ccr;
      mm.bumpScale = m.bump;
      mm.envMapIntensity = m.env;
    });
    state.material = s.material;
  }
  if (s.light) {
    state.light = Object.assign({}, state.light, s.light);
    applyLight();
  }
  if (s.extras) {
    state.extras = Object.assign({}, state.extras, s.extras);
    knobGroup.visible = LAYOUTS[state.layout].knob && state.extras.knob;
  }
  if (s.perKeyOverrides) {
    state.perKeyOverrides = s.perKeyOverrides;
    refreshLegends();
  }
}

function popKeys() {
  const gsap = window.gsap;
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
  const c = sRGB(hex);
  window.gsap.to(mat.color, {
    r: c.r, g: c.g, b: c.b,
    duration: d || 0.55,
    ease: 'power2.out',
    overwrite: 'auto',
  });
}

function apply3D(patch, animate) {
  const gsap = window.gsap;
  if (!animate) {
    applyInstant(patch);
    if (patch.layout) { state.layout = patch.layout; rebuildBoard(); }
    if (patch.profile) { state.profile = patch.profile; buildKeys(); }
    return;
  }
  if (patch.colorway) {
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
  if (patch.caseColor) tweenColor(matCase, CASES[patch.caseColor].c);
  if (patch.finish) {
    const f = FINISHES[patch.finish];
    gsap.to(matCase, { metalness: f.metal, roughness: f.rough, clearcoat: f.cc, duration: 0.5 });
  }
  if (patch.plate) {
    tweenColor(matPlate, PLATES[patch.plate].c);
    applyPlateFinish(patch.plate);
  }
  if (patch.sw) tweenColor(matStem, SWITCHES[patch.sw].dot, 0.4);
  if (patch.material) {
    const m = MATERIALS[patch.material];
    [matAlpha, matMod, matAccent].forEach((mm) => {
      gsap.to(mm, { roughness: m.rough, clearcoat: m.cc, clearcoatRoughness: m.ccr, duration: 0.5 });
      mm.bumpScale = m.bump;
      mm.envMapIntensity = m.env;
    });
  }
  if (patch.light) applyLight();
  if (patch.extras !== undefined)
    knobGroup.visible = LAYOUTS[state.layout].knob && state.extras.knob;
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
