import { state } from '../core/state.js';
import { setState } from '../core/update.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, EXTRAS, PROFILES, LIGHT_COLORS } from '../data/components.js';
import { PRESETS } from '../data/presets.js';
import { toast } from './toast.js';
import { playSwitch } from './sound.js';

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

export function openGallery() {
  syncNav('gallery');
  const { savedBuilds } = window.__MODKEYS__ || { savedBuilds: [] };
  const { thumbs } = window.__MODKEYS__ || { thumbs: {} };
  let html = '<div class="secTitle">FEATURED</div><div class="galGrid">' +
    PRESETS.map((p) =>
      `<button class="galCard" data-gal="${p.id}"><img src="${thumbs[p.id] || ''}" alt="">
        <div class="cap"><div class="nm">${p.name}</div><div class="tg">${COLORWAYS[p.s.colorway].name}</div></div></button>`,
    ).join('') + '</div>';
  if (savedBuilds.length) {
    html += '<div class="secTitle">YOUR BUILDS</div><div class="galGrid">' +
      savedBuilds.map((b, i) =>
        `<button class="galCard" data-saved="${i}"><img src="${b.img}" alt="">
          <div class="cap"><div class="nm">${b.name}</div><div class="tg">${COLORWAYS[b.snap.colorway].name}</div></div></button>`,
      ).join('') + '</div>';
  } else {
    html += '<div class="secTitle">YOUR BUILDS</div><div class="hint" style="margin-bottom:16px">No saved builds yet. Use <strong>Save Build</strong> in the sidebar to save your first one.</div>';
  }
  openModal('Gallery', html);
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
    playSwitch(SWITCHES[swm.dataset.swm].sound);
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
