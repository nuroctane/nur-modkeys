import * as THREE from 'three';
import gsap from 'gsap';
window.gsap = gsap;

import { state, stateSlice } from './core/state.js';
import { registerSyncUI, setState } from './core/update.js';
import { rebuildBoard, preloadEmoji } from './core/keyboard.js';
import { ctrl, setView } from './core/controls.js';
import {
  renderer, scene, camera, root,
  matAlpha, matMod, matAccent, matCase, matPlate, matStem,
  capMat, sRGB, applyPlateFinish, uni,
} from './core/scene.js';
import { renderPanel, syncUI } from './ui/panels.js';
import { initTheme } from './ui/theme.js';
import { toast } from './ui/toast.js';
import { openLibrary, openGallery, openSwitchesModal, openAccessories, closeModal } from './ui/modals.js';
import { PRESETS } from './data/presets.js';
import { COLORWAYS } from './data/colorways.js';
import { CASES, PLATES, SWITCHES } from './data/components.js';
import { downloadKLE, copyKLE } from './export/kle.js';
import { downloadSVG } from './export/svg.js';
import { downloadSpec } from './export/spec.js';

registerSyncUI(syncUI);

/* sidebar nav */
document.querySelectorAll('.snav button').forEach((btn) => {
  btn.addEventListener('click', () => renderPanel(btn.dataset.sec));
});

/* save build */
const savedBuilds = [];
const thumbs = {};
window.__MODKEYS__ = { savedBuilds, thumbs };

document.getElementById('saveBuild').addEventListener('click', () => {
  renderer.render(scene, camera);
  savedBuilds.push({
    name: 'Build ' + String(savedBuilds.length + 1).padStart(2, '0'),
    snap: stateSlice(),
    layout: state.layout,
    img: renderer.domElement.toDataURL('image/png'),
  });
  toast('Build saved. Find it under Gallery.');
});

/* view pills */
document.getElementById('pills').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b || !b.dataset.view) return;
  setView(b.dataset.view);
});

/* toolbar */
document.getElementById('toolHand').addEventListener('click', () => {
  state.tool = state.tool === 'pan' ? 'orbit' : 'pan';
  document.querySelectorAll('.toolbar button').forEach((b) => b.classList.toggle('on', b.dataset.tool === state.tool));
});
document.getElementById('toolReset').addEventListener('click', () => {
  ctrl.theta = -0.58;
  ctrl.phi = 1.02;
  ctrl.radius = 10.6;
  ctrl.target.set(0, -0.08, 0);
  ctrl.vT = ctrl.vP = 0;
  setView('3d');
});

/* export buttons */
document.getElementById('exportKLE').addEventListener('click', downloadKLE);
document.getElementById('exportSVG').addEventListener('click', downloadSVG);
document.getElementById('exportSpec').addEventListener('click', downloadSpec);
document.getElementById('copyKLE')?.addEventListener('click', () => {
  copyKLE();
  toast('KLE layout copied to clipboard');
});

/* theme */
initTheme();

/* library open button */
document.getElementById('panelBody').addEventListener('click', (ev) => {
  if (ev.target.closest('#libOpen')) openLibrary();
});

/* sidebar toggle shortcut — no cart */
/* featured builds carousel */
document.getElementById('builds').addEventListener('click', (ev) => {
  const card = ev.target.closest('.bcard');
  if (!card) return;
  const p = PRESETS.find((x) => x.id === card.dataset.id);
  if (!p) return;
  /* apply preset — similar to setState but bulk */
  const patch = Object.assign({}, p.s, { selectedPreset: p.id });
  if (patch.colorway) state.colorway = patch.colorway;
  setState(patch);
  toast(p.name + ' loaded');
});

/* resize */
const stage = document.getElementById('stage');
function resize() {
  const r = stage.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

/* thumbnail generation */
function genThumbs() {
  const snap = stateSlice();
  const r = stage.getBoundingClientRect();
  renderer.setPixelRatio(1);
  renderer.setSize(460, 272, false);
  camera.aspect = 460 / 272;
  camera.updateProjectionMatrix();
  const sc = { theta: ctrl.theta, phi: ctrl.phi, radius: ctrl.radius, ty: ctrl.target.y };
  ctrl.theta = -0.58;
  ctrl.phi = 1.02;
  ctrl.radius = 11.4;
  ctrl.target.y = -0.08;
  ctrl.apply();
  uni.uTime.value = 2.2;
  PRESETS.forEach((p) => {
    const s = p.s;
    if (s.colorway) {
      const cw = COLORWAYS[s.colorway];
      matAlpha.color.copy(sRGB(cw.a.bg));
      matMod.color.copy(sRGB(cw.m.bg));
      matAccent.color.copy(sRGB(cw.x.bg));
    }
    if (s.caseColor) {
      matCase.color.copy(sRGB(CASES[s.caseColor].c));
    }
    if (s.plate) {
      matPlate.color.copy(sRGB(PLATES[s.plate].c));
      applyPlateFinish(s.plate);
    }
    if (s.sw) {
      matStem.color.copy(sRGB(SWITCHES[s.sw].dot));
    }
    if (s.light) {
      const modes = { wave: 0, static: 1, breathe: 2, off: 3 };
      Object.assign(state.light, s.light);
      uni.uColor.value.set(state.light.color);
      uni.uMode.value = modes[state.light.mode] || 3;
      uni.uBright.value = state.light.bright;
    }
    renderer.render(scene, camera);
    thumbs[p.id] = renderer.domElement.toDataURL('image/png');
  });
  /* restore */
  Object.assign(state, snap);
  ctrl.theta = sc.theta;
  ctrl.phi = sc.phi;
  ctrl.radius = sc.radius;
  ctrl.target.y = sc.ty;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  /* restore scene materials */
  if (snap.colorway) {
    const cw = COLORWAYS[snap.colorway];
    matAlpha.color.copy(sRGB(cw.a.bg));
    matMod.color.copy(sRGB(cw.m.bg));
    matAccent.color.copy(sRGB(cw.x.bg));
  }
  if (snap.caseColor) matCase.color.copy(sRGB(CASES[snap.caseColor].c));
  if (snap.plate) {
    matPlate.color.copy(sRGB(PLATES[snap.plate].c));
    applyPlateFinish(snap.plate);
  }
  if (snap.sw) matStem.color.copy(sRGB(SWITCHES[snap.sw].dot));
}

/* render loop */
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  uni.uTime.value = clock.getElapsedTime();
  if (Math.abs(ctrl.vT) > 1e-4 || Math.abs(ctrl.vP) > 1e-4) {
    ctrl.theta += ctrl.vT;
    ctrl.phi += ctrl.vP;
    ctrl.vT *= 0.9;
    ctrl.vP *= 0.9;
  }
  ctrl.apply();
  renderer.render(scene, camera);
}

/* boot */
preloadEmoji();
rebuildBoard();
resize();
ctrl.apply();
tick();
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    genThumbs();
    renderPanel('keycaps');
    syncUI();
    setView('3d');
    gsap.from(root.scale, {
      x: 0.45 * 0.9, y: 0.45 * 0.9, z: 0.45 * 0.9,
      duration: 1.1, ease: 'power3.out',
    });
    gsap.from(root.rotation, {
      y: -0.4, duration: 1.3, ease: 'power3.out',
    });
    gsap.to(document.getElementById('loader'), {
      opacity: 0, duration: 0.5, delay: 0.15,
      onComplete: () => document.getElementById('loader').remove(),
    });
  });
});
