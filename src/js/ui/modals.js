import { state } from '../core/state.js';
import { setState, effectiveColorway } from '../core/update.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, EXTRAS, PROFILES, LIGHT_COLORS } from '../data/components.js';
import { PRESETS } from '../data/presets.js';
import { toast } from './toast.js';
import { playKeyClick } from './sound.js';

const $ = (id) => document.getElementById(id);

export function closeModal() {
  $('modal').classList.remove('open');
  syncNav('builder');
}

export function openModal(title, html) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = html;
  $('modal').classList.add('open');
}

const cwName = (snap) => snap.customColors ? 'Custom' : (COLORWAYS[snap.colorway]?.name ?? 'Custom');

function syncNav(id) {
  document.querySelectorAll('#tnav button').forEach((b) => b.classList.toggle('on', b.dataset.nav === id));
}

function presetPatch(p) {
  const s = p.s;
  return Object.assign({}, s, {
    colorway: s.colorway || state.colorway,
    caseColor: s.caseColor || state.caseColor,
    plate: s.plate || state.plate,
    sw: s.sw || state.sw,
    light: s.light ? Object.assign({}, state.light, s.light) : state.light,
    selectedPreset: p.id,
  });
}

export function openLibrary() {
  syncNav('keycaps');
  openModal('Keycap Library',
    '<div class="libGrid">' +
    Object.entries(COLORWAYS).map(([id, c]) =>
      `<button class="libCard ${state.colorway === id ? 'on' : ''}" data-lib="${id}">
        <div class="libCaps"><span style="background:${c.a.bg}"></span><span style="background:${c.m.bg}"></span><span style="background:${c.x.bg}"></span></div>
        <div class="nm">${c.name}</div><div class="tg">${c.tag}</div>
      </button>`,
    ).join('') + '</div>',
  );
}

function thumbnailOrGradient(src, snap) {
  if (src) return `<img src="${src}" alt="">`;
  const cwGuess = snap?.customColors?.a?.bg && snap?.customColors?.m?.bg
    ? [snap.customColors.a.bg, snap.customColors.m.bg]
    : (COLORWAYS[snap?.colorway] ? [COLORWAYS[snap.colorway].a.bg, COLORWAYS[snap.colorway].m.bg] : ['#333', '#555']);
  return `<div class="img" style="background:linear-gradient(135deg,${cwGuess[0]} 50%,${cwGuess[1]} 50%)"></div>`;
}

export function openGallery() {
  syncNav('gallery');
  const { savedBuilds, thumbs } = window.__MODKEYS__ || { savedBuilds: [], thumbs: {} };
  let html = '<div class="secTitle">FEATURED</div><div class="galGrid">' +
    PRESETS.map((p) =>
      `<button class="galCard" data-gal="${p.id}">${thumbnailOrGradient(thumbs[p.id], p.s)}
        <div class="cap"><div class="nm">${p.name}</div><div class="tg">${cwName(p.s)}</div></div></button>`,
    ).join('') + '</div>';
  html += '<div class="secTitle">COMMUNITY</div><div class="galGrid" id="communityGrid">' +
    '<div class="hint" style="grid-column:1/-1">Loading community builds...</div></div>';
  if (savedBuilds.length) {
    html += '<div class="secTitle">YOUR BUILDS</div><div class="galGrid">' +
      savedBuilds.map((b, i) =>
        `<button class="galCard" data-saved="${i}">${thumbnailOrGradient(b.img, b.snap)}
          <div class="cap"><div class="nm">${b.name}</div><div class="tg">${cwName(b.snap)}</div></div></button>`,
      ).join('') + '</div>';
  } else {
    html += '<div class="secTitle">YOUR BUILDS</div><div class="hint" style="margin-bottom:16px">No saved builds yet. Use <strong>Save Build</strong> in the sidebar to save your first one.</div>';
  }
  openModal('Gallery', html);

  /* lazy-load community section */
  const lg = window.__MODKEYS__?.loadGallery;
  if (lg) {
    lg().then((community) => {
      if (!$('modal').classList.contains('open')) return;
      const grid = document.getElementById('communityGrid');
      if (!grid) return;
      if (community === null) {
        grid.innerHTML = '<div class="hint" style="grid-column:1/-1">Community gallery offline. <button class="linkish" id="galleryRetry">Retry</button></div>';
        const rb = document.getElementById('galleryRetry');
        if (rb) rb.addEventListener('click', () => { openGallery(); });
        return;
      }
      if (community.length === 0) {
        grid.innerHTML = '<div class="hint" style="grid-column:1/-1">No community builds yet. Be the first — hit <strong>Save Build</strong>.</div>';
        return;
      }
      const { thumbs } = window.__MODKEYS__ || { thumbs: {} };
      grid.innerHTML = community.map((t) =>
        `<button class="galCard" data-community="${t.id}">${thumbnailOrGradient(thumbs[t.id], t.snap)}<div class="cap"><div class="nm">${t.name}</div><div class="tg">${t.layout || ''}</div></div></button>`,
      ).join('');
    }).catch(() => {
      const grid = document.getElementById('communityGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="hint" style="grid-column:1/-1">Community gallery offline. <button class="linkish" id="galleryRetry">Retry</button></div>';
      const rb = document.getElementById('galleryRetry');
      if (rb) rb.addEventListener('click', () => { openGallery(); });
    });
  }
}

export function openSwitchesModal() {
  syncNav('switches');
  openModal('Switches',
    '<div class="libGrid">' +
    Object.entries(SWITCHES).map(([id, s]) =>
      `<button class="libCard ${state.sw === id ? 'on' : ''}" data-swm="${id}">
        <div class="libCaps"><span style="background:${s.dot}"></span></div>
        <div class="nm">${s.name}</div><div class="tg">${s.type} · ${s.force} · ${s.sound}</div>
      </button>`,
    ).join('') +
    '</div><div class="hint" style="margin-top:14px">Selecting a switch updates the live build. Click any key on the board to hear it.</div>',
  );
}

export function openAccessories() {
  syncNav('accessories');
  openModal('Accessories',
    '<div class="libGrid">' +
    Object.entries(EXTRAS).map(([id, e]) =>
      `<button class="libCard ${state.extras[id] ? 'on' : ''}" data-ext="${id}">
        <div class="nm">${e.name}</div><div class="tg">${e.tag}</div>
      </button>`,
    ).join('') + '</div>',
  );
}

/* modal body event delegation */
$('modalBody').addEventListener('click', (ev) => {
  const lib = ev.target.closest('[data-lib]');
  if (lib) {
    setState({ colorway: lib.dataset.lib, selectedPreset: null });
    openLibrary();
    toast(COLORWAYS[lib.dataset.lib].name + ' applied');
    return;
  }
  const gal = ev.target.closest('[data-gal]');
  if (gal) {
    const p = PRESETS.find((x) => x.id === gal.dataset.gal);
    setState(presetPatch(p));
    closeModal();
    toast(p.name + ' loaded');
    return;
  }
  const community = ev.target.closest('[data-community]');
  if (community) {
    const { galleryCache } = window.__MODKEYS__ || { galleryCache: [] };
    const t = galleryCache.find((e) => e.id === community.dataset.community);
    if (t && t.snap) {
      const s = t.snap;
      if (s.layout && s.layout !== state.layout) setState({ layout: s.layout });
      setState(Object.assign({}, s, { selectedPreset: null }));
      closeModal();
      toast(t.name + ' loaded');
    }
    return;
  }
  const sv = ev.target.closest('[data-saved]');
  if (sv) {
    const { savedBuilds } = window.__MODKEYS__ || { savedBuilds: [] };
    const b = savedBuilds[parseInt(sv.dataset.saved)];
    if (b.layout !== state.layout) setState({ layout: b.layout });
    setState(Object.assign({}, b.snap, { selectedPreset: null }));
    closeModal();
    toast(b.name + ' loaded');
    return;
  }
  const swm = ev.target.closest('[data-swm]');
  if (swm) {
    setState({ sw: swm.dataset.swm, selectedPreset: null });
    playKeyClick(SWITCHES[swm.dataset.swm].sound, state.material);
    openSwitchesModal();
    return;
  }
  const ext = ev.target.closest('[data-ext]');
  if (ext) {
    const e = {};
    e[ext.dataset.ext] = !state.extras[ext.dataset.ext];
    setState({ extras: e });
    openAccessories();
    return;
  }
});

/* top nav event delegation for modals */
$('tnav').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  const id = b.dataset.nav;
  if (id === 'builder') { closeModal(); return; }
  if (id === 'gallery') openGallery();
  if (id === 'keycaps') openLibrary();
  if (id === 'switches') openSwitchesModal();
  if (id === 'accessories') openAccessories();
});

$('modalClose').addEventListener('click', closeModal);
$('modalBack').addEventListener('click', closeModal);
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') closeModal();
});
