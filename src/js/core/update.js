import * as THREE from 'three';
import gsap from 'gsap';
import { state, stateSlice } from './state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, PROFILES, GAP } from '../data/components.js';
import {
  renderer, scene, camera, root, caseGroup, capsGroup, knobGroup, cableGroup, wristGroup,
  keyGlowGroup, glowPlane,
  matAlpha, matMod, matAccent, matCase, matPlate, matStem,
  capMats, applyPlateFinish, applyCapMaterial, uni, sRGB,
} from './scene.js';
import { rebuildBoard, buildKeys, refreshLegends, preloadEmoji } from './keyboard.js';
import { setView } from './controls.js';
import { pushState, undo as undoHistory, redo as redoHistory } from './history.js';
import { clearPerKeyCapColors } from './perKey.js';

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
  /* wave is mode 0 — must use nullish coalescing, not || (0 is falsy). */
  const m = modes[state.light.mode];
  uni.uMode.value = m !== undefined ? m : 3;
  uni.uColor.value.set(state.light.color);
  uni.uBright.value = state.light.bright;
  const on = state.light.mode !== 'off';
  caseGroup.children.forEach((c) => {
    if (c.material && c.material !== matCase && c.material !== matPlate)
      c.visible = on;
  });
  /* glowPlane + keyGlow live on root, not caseGroup — hide them for Off too */
  glowPlane.visible = on;
  keyGlowGroup.visible = on;
}

function applyColors(cw) {
  matAlpha.color.copy(sRGB(cw.a.bg));
  matMod.color.copy(sRGB(cw.m.bg));
  matAccent.color.copy(sRGB(cw.x.bg));
}

/** Truthy object customColors (photo match / custom hex roles). */
function hasCustomColors(cc) {
  return !!(cc && typeof cc === 'object' && (cc.a || cc.m || cc.x));
}

/**
 * Prefer customColors over named colorway when both appear in a snap
 * (photo match leaves colorway id set while roles live in customColors).
 * Explicit customColors: null + colorway chip clears custom and applies stock.
 *
 * Global colorway / customColors changes strip per-key bg/fg (photo match)
 * unless the patch also carries perKeyOverrides (full snap load restores them).
 */
function applyColorwayFields(s, { instant = true } = {}) {
  if (s.brand !== undefined) state.brand = s.brand;

  const applyingGlobalColors =
    hasCustomColors(s.customColors) ||
    (s.colorway && COLORWAYS[s.colorway]) ||
    s.customColors === null;
  /* Only strip when this patch is a global recolour, not a full snap that
     already includes its own perKeyOverrides (photo gallery load). */
  const stripPhotoCaps =
    applyingGlobalColors && s.perKeyOverrides === undefined;
  let strippedCaps = false;
  if (stripPhotoCaps) {
    strippedCaps = clearPerKeyCapColors();
  }

  if (hasCustomColors(s.customColors)) {
    if (instant) applyColors(s.customColors);
    else {
      tweenColor(matAlpha, s.customColors.a.bg);
      tweenColor(matMod, s.customColors.m.bg);
      tweenColor(matAccent, s.customColors.x.bg);
    }
    state.customColors = s.customColors;
    if (s.colorway && COLORWAYS[s.colorway]) state.colorway = s.colorway;
    if (strippedCaps && instant) buildKeys();
    else if (instant) refreshLegends();
    else gsap.delayedCall(0.26, strippedCaps ? buildKeys : refreshLegends);
    if (instant && panelRenderHook) panelRenderHook(state.section);
    return;
  }

  if (s.colorway && COLORWAYS[s.colorway]) {
    const cw = COLORWAYS[s.colorway];
    if (instant) applyColors(cw);
    else {
      tweenColor(matAlpha, cw.a.bg);
      tweenColor(matMod, cw.m.bg);
      tweenColor(matAccent, cw.x.bg);
    }
    state.colorway = s.colorway;
    /* clear custom on stock colorway apply (chip passes customColors: null) */
    if (s.customColors === null || s.customColors === undefined) {
      state.customColors = null;
    }
    if (strippedCaps && instant) buildKeys();
    else if (instant) refreshLegends();
    else gsap.delayedCall(0.26, strippedCaps ? buildKeys : refreshLegends);
    if (instant && panelRenderHook) panelRenderHook(state.section);
    return;
  }

  if (s.customColors === null) {
    state.customColors = null;
    if (COLORWAYS[state.colorway]) {
      if (instant) applyColors(COLORWAYS[state.colorway]);
      else {
        const cw = COLORWAYS[state.colorway];
        tweenColor(matAlpha, cw.a.bg);
        tweenColor(matMod, cw.m.bg);
        tweenColor(matAccent, cw.x.bg);
      }
    }
    if (strippedCaps && instant) buildKeys();
    else if (instant) refreshLegends();
    else gsap.delayedCall(0.26, strippedCaps ? buildKeys : refreshLegends);
    return;
  }

  if (s.brand !== undefined) {
    if (instant) refreshLegends();
  }
}

/** Per-key bg/image etc. need mesh rebuild — legends alone are not enough. */
function applyPerKeyOverridesField(ov) {
  state.perKeyOverrides = ov && typeof ov === 'object' ? ov : {};
  buildKeys();
}

function applyInstant(s) {
  applyColorwayFields(s, { instant: true });
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
  if (s.perKeyOverrides !== undefined) {
    applyPerKeyOverridesField(s.perKeyOverrides);
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
    /* layout rebuild includes buildKeys; avoid double work if already built for overrides */
    if (patch.layout) {
      state.layout = patch.layout;
      rebuildBoard();
    } else if (patch.profile) {
      state.profile = patch.profile;
      /* buildKeys if applyInstant did not already (no perKeyOverrides in patch) */
      if (patch.perKeyOverrides === undefined) buildKeys();
    }
    return;
  }
  applyColorwayFields(patch, { instant: false });
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
  } else if (patch.perKeyOverrides !== undefined) {
    applyPerKeyOverridesField(patch.perKeyOverrides);
  }
}

/**
 * One-shot load of a full build snap (gallery / share / saved).
 * Instant apply so customColors + per-key faces + board tints all stick.
 */
export function loadSnap(snap, opts = {}) {
  if (!snap || typeof snap !== 'object') return;
  const patch = Object.assign({}, snap);
  if (opts.selectedPreset !== undefined) patch.selectedPreset = opts.selectedPreset;
  else if (patch.selectedPreset === undefined) patch.selectedPreset = null;
  /* Full snap: missing overrides must clear leftover photo colours from prior build */
  if (patch.perKeyOverrides === undefined) patch.perKeyOverrides = {};
  if (patch.customColors === undefined) patch.customColors = null;
  if (patch.caseCustomColor === undefined) patch.caseCustomColor = null;
  if (patch.plateColor === undefined) patch.plateColor = null;
  if (patch.switchColor === undefined) patch.switchColor = null;
  setState(patch, { animate: false, skipPanel: !!opts.skipPanel });
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
  else if (snap.profile) buildKeys();
  /* applyInstant already buildKeys when snap has perKeyOverrides */
  if (_syncUI) _syncUI();
  return true;
}

export function redo() {
  const snap = redoHistory();
  if (!snap) return false;
  Object.assign(state, snap);
  applyInstant(snap);
  if (snap.layout) rebuildBoard();
  else if (snap.profile) buildKeys();
  if (_syncUI) _syncUI();
  return true;
}
