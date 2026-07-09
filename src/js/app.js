import * as THREE from 'three';
import gsap from 'gsap';

import { state, stateSlice } from './core/state.js';
import { registerSyncUI, setState, undo, redo, onPanelRender } from './core/update.js';
import { rebuildBoard, preloadEmoji } from './core/keyboard.js';
import { ctrl, setView, onKeyEditClick } from './core/controls.js';
import {
  renderer, scene, camera, root,
  matAlpha, matMod, matAccent, matCase, matPlate, matStem,
  capMat, sRGB, applyPlateFinish, uni,
} from './core/scene.js';
import { renderPanel, syncUI, showKeyEditor, hideKeyEditor, setupPanelEvents } from './ui/panels.js';
import { initTheme } from './ui/theme.js';
import { toast } from './ui/toast.js';
import { openLibrary, openGallery, openSwitchesModal, openAccessories, closeModal } from './ui/modals.js';
import { PRESETS } from './data/presets.js';
import { COLORWAYS } from './data/colorways.js';
import { CASES, PLATES, SWITCHES } from './data/components.js';
import { downloadKLE, copyKLE } from './export/kle.js';
import { downloadSVG } from './export/svg.js';
import { downloadSpec } from './export/spec.js';
import { exportPDF } from './export/pdf.js';
import { loadHash, shareURL } from './core/shrinker.js';
import { clearAllOverrides } from './core/perKey.js';
import { resetHistory, canUndo, canRedo } from './core/history.js';
import { trackEvent } from './core/analytics.js';

let animationId = null;
let cleanupFns = [];

const MOBILE_MQ = '(max-width: 768px), ((pointer: coarse) and (max-width: 1024px))';

export function mountModkeys() {
  /* Shell selection handled by shell.js before this module loads.
     Clean up the template element and bind the breakpoint reload. */
  const mTpl = document.getElementById('mShellTpl');
  if (mTpl) mTpl.remove();
  const boundaryQ = window.matchMedia(MOBILE_MQ);
  const onBoundary = () => location.reload();
  if (boundaryQ.addEventListener) {
    boundaryQ.addEventListener('change', onBoundary);
    cleanupFns.push(() => boundaryQ.removeEventListener('change', onBoundary));
  }

  registerSyncUI(syncUI);
  setupPanelEvents();

  /* sidebar nav */
  document.querySelectorAll('.snav button').forEach((btn) => {
    btn.addEventListener('click', () => renderPanel(btn.dataset.sec));
  });

  /* save build */
  const savedBuilds = [];
  const thumbs = {};
  window.__MODKEYS__ = { savedBuilds, thumbs, getState: stateSlice, loadState: loadBuildState };

  function stateSliceWithoutImages() {
    const s = stateSlice();
    if (s.perKeyOverrides) {
      const cleaned = {};
      for (const [k, v] of Object.entries(s.perKeyOverrides)) {
        const entry = { ...v };
        delete entry.imageData;
        cleaned[k] = entry;
      }
      s.perKeyOverrides = cleaned;
    }
    return s;
  }

  document.getElementById('saveBuild').addEventListener('click', async () => {
    const raw = window.prompt('Name this build:', 'Build ' + String(savedBuilds.length + 1).padStart(2, '0'));
    if (raw === null) return;
    const name = (raw || '').trim().slice(0, 40) || 'Build ' + String(savedBuilds.length + 1).padStart(2, '0');
    renderer.render(scene, camera);
    const snap = stateSlice();
    savedBuilds.push({
      name,
      snap,
      layout: state.layout,
      img: renderer.domElement.toDataURL('image/png'),
    });
    toast('Build saved. Find it under Gallery.');
    let sync = 'local';
    try {
      const res = await fetch('/api/modkeys/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, snap: stateSliceWithoutImages() }),
      });
      if (res.ok) {
        toast('Synced to community gallery');
        sync = 'gallery';
      } else toast('Saved locally (gallery offline)');
    } catch {
      toast('Saved locally (gallery offline)');
    }
    trackEvent('Modkeys Save', { layout: state.layout, sync });
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

  /* undo/redo/share */
  document.getElementById('toolUndo')?.addEventListener('click', () => {
    const ok = undo();
    if (!ok) toast('Nothing to undo');
  });
  document.getElementById('toolRedo')?.addEventListener('click', () => {
    const ok = redo();
    if (!ok) toast('Nothing to redo');
  });
  document.getElementById('toolShare')?.addEventListener('click', () => {
    const url = shareURL(stateSlice());
    if (url) {
      navigator.clipboard.writeText(url);
      toast('Share link copied!');
      trackEvent('Modkeys Share', { layout: state.layout });
    } else toast('Could not create share link');
  });

  /* export buttons */
  document.getElementById('exportKLE').addEventListener('click', () => {
    downloadKLE();
    trackEvent('Modkeys Export', { format: 'kle', layout: state.layout });
  });
  document.getElementById('exportSVG').addEventListener('click', () => {
    downloadSVG();
    trackEvent('Modkeys Export', { format: 'svg', layout: state.layout });
  });
  document.getElementById('exportSpec').addEventListener('click', () => {
    downloadSpec();
    trackEvent('Modkeys Export', { format: 'spec', layout: state.layout });
  });
  document.getElementById('copyKLE')?.addEventListener('click', () => {
    copyKLE();
    toast('KLE layout copied to clipboard');
    trackEvent('Modkeys Export', { format: 'kle_copy', layout: state.layout });
  });
  document.getElementById('exportPDF')?.addEventListener('click', () => {
    exportPDF()
      .then(() => trackEvent('Modkeys Export', { format: 'pdf', layout: state.layout }))
      .catch(() => toast('PDF export failed'));
  });

  /* theme */
  initTheme();

  /* top nav: was decorative markup with no handlers; now routes to the
     matching modal. Same wiring serves both shells. */
  document.getElementById('tnav')?.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-nav]');
    if (!b) return;
    document.querySelectorAll('#tnav button').forEach((x) => x.classList.toggle('on', x === b));
    const nav = b.dataset.nav;
    if (nav === 'builder') closeModal();
    else if (nav === 'gallery') openGallery();
    else if (nav === 'keycaps') openLibrary();
    else if (nav === 'switches') openSwitchesModal();
    else if (nav === 'accessories') openAccessories();
  });

  /* library open button */
  document.getElementById('panelBody').addEventListener('click', (ev) => {
    if (ev.target.closest('#libOpen')) openLibrary();
  });

  /* featured builds carousel (desktop shell only) */
  document.getElementById('builds')?.addEventListener('click', (ev) => {
    const card = ev.target.closest('.bcard');
    if (!card) return;
    const p = PRESETS.find((x) => x.id === card.dataset.id);
    if (!p) return;
    const patch = Object.assign({}, p.s, { selectedPreset: p.id });
    if (patch.colorway) state.colorway = patch.colorway;
    setState(patch);
    toast(p.name + ' loaded');
  });

  /* lazy gallery fetch */
  window.__MODKEYS__.loadGallery = async function loadGallery() {
    /* Array (including []) = successful fetch, memoized.
       null = last fetch failed; not memoized, next call retries. */
    if (Array.isArray(window.__MODKEYS__.galleryCache)) return window.__MODKEYS__.galleryCache;
    try {
      const res = await fetch('/api/modkeys/gallery');
      if (!res.ok) throw new Error('gallery ' + res.status);
      const data = await res.json();
      const gc = data.templates || [];
      window.__MODKEYS__.galleryCache = gc;
      const save = beginThumbRender();
      gc.forEach(t => {
        if (!t.snap || window.__MODKEYS__.thumbs[t.id]) return;
        try {
          window.__MODKEYS__.thumbs[t.id] = renderSnapThumb(t.snap);
        } catch (e) {
          // thumbnail failed, leave unset
        }
      });
      endThumbRender(save);
      return gc;
    } catch (err) {
      window.__MODKEYS__.galleryCache = null;
      return null;
    }
  };

  /* key editor / Customize selection */
  onKeyEditClick((keyData) => {
    showKeyEditor(keyData, {
      multi: !!(keyData._multi || keyData._shiftKey),
      shiftKey: !!keyData._shiftKey,
    });
  });

  /* keyboard shortcuts */
  const keyHandler = (ev) => {
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z') {
      ev.preventDefault();
      const ok = undo();
      if (!ok) toast('Nothing to undo');
      else toast('Undo');
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'y') {
      ev.preventDefault();
      const ok = redo();
      if (!ok) toast('Nothing to redo');
      else toast('Redo');
    }
    if (ev.key === 'Escape') {
      hideKeyEditor();
    }
  };
  document.addEventListener('keydown', keyHandler);
  cleanupFns.push(() => document.removeEventListener('keydown', keyHandler));

  /* resize */
  const stage = document.getElementById('stage');
  function resize() {
    const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize).observe(stage);
  cleanupFns.push(() => ro.disconnect());

  /* thumbnail generation helpers */
  function beginThumbRender() {
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
    return { r, sc, snap: stateSlice() };
  }
  function endThumbRender(save) {
    Object.assign(state, save.snap);
    ctrl.theta = save.sc.theta;
    ctrl.phi = save.sc.phi;
    ctrl.radius = save.sc.radius;
    ctrl.target.y = save.sc.ty;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(save.r.width, save.r.height, false);
    camera.aspect = save.r.width / save.r.height;
    camera.updateProjectionMatrix();
    const snap = save.snap;
    if (snap.colorway) {
      const cw = COLORWAYS[snap.colorway];
      if (cw) {
        matAlpha.color.copy(sRGB(cw.a.bg));
        matMod.color.copy(sRGB(cw.m.bg));
        matAccent.color.copy(sRGB(cw.x.bg));
      }
    }
    if (snap.caseColor || snap.caseCustomColor !== undefined) {
      const cHex = snap.caseCustomColor || CASES[snap.caseColor || state.caseColor]?.c || CASES[state.caseColor].c;
      matCase.color.copy(sRGB(cHex));
    }
    if (snap.plate || snap.plateColor !== undefined) {
      const pid = snap.plate || state.plate;
      const phex = snap.plateColor !== undefined ? snap.plateColor : (state.plateColor || PLATES[pid].c);
      applyPlateFinish(pid, phex || PLATES[pid].c);
    }
    if (snap.sw || snap.switchColor !== undefined) {
      const sHex = snap.switchColor || SWITCHES[snap.sw || state.sw]?.dot || SWITCHES[state.sw].dot;
      matStem.color.copy(sRGB(sHex));
    }
  }
  function renderSnapThumb(s) {
    if (s.colorway) {
      const cw = COLORWAYS[s.colorway] || s.customColors;
      if (cw) {
        matAlpha.color.copy(sRGB(cw.a.bg));
        matMod.color.copy(sRGB(cw.m.bg));
        matAccent.color.copy(sRGB(cw.x.bg));
      }
    } else if (s.customColors) {
      const cc = s.customColors;
      matAlpha.color.copy(sRGB(cc.a.bg));
      matMod.color.copy(sRGB(cc.m.bg));
      if (cc.x && cc.x.bg) matAccent.color.copy(sRGB(cc.x.bg));
    }
    if (s.caseColor || s.caseCustomColor !== undefined) {
      const cHex = s.caseCustomColor || CASES[s.caseColor || state.caseColor]?.c || CASES[state.caseColor].c;
      matCase.color.copy(sRGB(cHex));
    }
    if (s.plate || s.plateColor !== undefined) {
      const pid = s.plate || state.plate;
      const phex = s.plateColor != null ? s.plateColor : (state.plateColor || PLATES[pid].c);
      applyPlateFinish(pid, phex || PLATES[pid].c);
    }
    if (s.sw || s.switchColor !== undefined) {
      const sHex = s.switchColor || SWITCHES[s.sw || state.sw]?.dot || SWITCHES[state.sw].dot;
      matStem.color.copy(sRGB(sHex));
    }
    if (s.light) {
      const modes = { wave: 0, static: 1, breathe: 2, off: 3 };
      Object.assign(state.light, s.light);
      uni.uColor.value.set(state.light.color);
      uni.uMode.value = modes[state.light.mode] || 3;
      uni.uBright.value = state.light.bright;
    }
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  }
  function genThumbs() {
    const save = beginThumbRender();
    PRESETS.forEach((p) => {
      thumbs[p.id] = renderSnapThumb(p.s);
    });
    endThumbRender(save);
  }

  /* render loop */
  const clock = new THREE.Clock();
  const undoToggle = () => {
    document.getElementById('toolUndo').toggleAttribute('disabled', !canUndo());
    document.getElementById('toolRedo').toggleAttribute('disabled', !canRedo());
  };
  function tick() {
    animationId = requestAnimationFrame(tick);
    uni.uTime.value = clock.getElapsedTime();
    if (Math.abs(ctrl.vT) > 1e-4 || Math.abs(ctrl.vP) > 1e-4) {
      ctrl.theta += ctrl.vT;
      ctrl.phi += ctrl.vP;
      ctrl.vT *= 0.9;
      ctrl.vP *= 0.9;
    }
    ctrl.apply();
    renderer.render(scene, camera);
    undoToggle();
  }

  /* boot */
  preloadEmoji();
  rebuildBoard();
  resize();
  ctrl.apply();
  tick();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      /* restore shared URL */
      const hashData = loadHash();
      if (hashData) {
        setState(Object.assign({}, hashData));
        resetHistory(stateSlice());
      }
      genThumbs();
      /* populate featured builds carousel (desktop shell only) */
      const buildsEl = document.getElementById('builds');
      if (buildsEl) buildsEl.innerHTML = PRESETS.map((p) =>
        `<button class="bcard" data-id="${p.id}">
           <div class="img" style="background:${COLORWAYS[p.s.colorway].a.bg}"><img src="${thumbs[p.id]}" alt=""></div>
           <div class="nm">${p.name}</div>
         </button>`
      ).join('');
      /* featured carousel arrows (were never wired) */
      const btrack = document.getElementById('builds');
      const aL = document.getElementById('scrollL');
      const aR = document.getElementById('scrollR');
      if (btrack && aL && aR) {
        const step = () => Math.max(160, Math.round(btrack.clientWidth * 0.8));
        const syncArrows = () => {
          const max = btrack.scrollWidth - btrack.clientWidth;
          aL.disabled = btrack.scrollLeft <= 2;
          aR.disabled = btrack.scrollLeft >= max - 2;
        };
        aL.addEventListener('click', () => btrack.scrollBy({ left: -step(), behavior: 'smooth' }));
        aR.addEventListener('click', () => btrack.scrollBy({ left: step(), behavior: 'smooth' }));
        btrack.addEventListener('scroll', syncArrows, { passive: true });
        window.addEventListener('resize', syncArrows);
        requestAnimationFrame(syncArrows);
      }

      /* mobile actions bar: proxy taps to the real (hidden on mobile)
         sidebar buttons so save/export logic stays defined in one place */
      const mMenu = document.getElementById('mExportMenu');
      const mToggle = document.getElementById('mExportToggle');
      if (mMenu && mToggle) {
        mMenu.addEventListener('click', () => mMenu.classList.remove('open'));
        mToggle.addEventListener('click', (ev) => {
          ev.stopPropagation();
          mMenu.classList.toggle('open');
        });
        document.addEventListener('click', (ev) => {
          if (mMenu.classList.contains('open') && !mMenu.contains(ev.target) && ev.target !== mToggle) {
            mMenu.classList.remove('open');
          }
        });
      }
      onPanelRender(renderPanel);
      renderPanel('keycaps');
      syncUI();
      setView('3d');
      const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!rm) {
        gsap.from(root.scale, {
          x: 0.45 * 0.9, y: 0.45 * 0.9, z: 0.45 * 0.9,
          duration: 1.1, ease: 'power3.out',
        });
        gsap.from(root.rotation, {
          y: -0.4, duration: 1.3, ease: 'power3.out',
        });
      }
      gsap.to(document.getElementById('loader'), {
        opacity: 0, duration: rm ? 0.2 : 0.5,
        onComplete: () => document.getElementById('loader')?.remove(),
      });
    });
  });
}

function loadBuildState(buildState) {
  setState(Object.assign({}, buildState));
  resetHistory(stateSlice());
  syncUI();
}

export function unmountModkeys() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
}
