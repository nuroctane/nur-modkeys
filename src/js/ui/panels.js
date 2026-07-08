import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS, PANEL_SWATCHES } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, EXTRAS, PROFILES, LIGHT_COLORS } from '../data/components.js';
import { setState, effectiveColorway } from '../core/update.js';
import { setOverride, clearOverride, getOverride } from '../core/perKey.js';
import { loadImage, validateImageFile } from '../core/imageLoader.js';
import { MARKS } from '../data/art.js';
import { rebuildKey, getKeyLabel } from '../core/keyboard.js';
import { toast } from './toast.js';

const $ = (id) => document.getElementById(id);

export function lightDotStyle() {
  if (state.light.mode === 'off') return 'background:#3f3f45';
  if (state.light.mode === 'wave')
    return 'background:conic-gradient(#ff5e5e,#ffb35e,#5fd68b,#4ea1ff,#8a7bff,#ff5ea8,#ff5e5e)';
  return 'background:' + state.light.color;
}

export function syncUI(skipPanel) {
  const cw = effectiveColorway();
  $('dotKeycaps').style.background = cw.a.bg;
  $('dotSwitches').style.background = SWITCHES[state.sw].dot;
  $('dotCase').style.background = CASES[state.caseColor].c;
  $('dotPlate').style.background = PLATES[state.plate].c;
  $('dotLight').style.cssText = lightDotStyle();
  $('layoutVal').textContent = LAYOUTS[state.layout].pct;
  document.querySelectorAll('#builds .bcard').forEach((b) =>
    b.classList.toggle('on', b.dataset.id === state.selectedPreset),
  );
  if (!skipPanel) renderPanel(state.section);
}

function chipRow(items, cur, act) {
  return '<div class="rowFlex">' +
    items.map(([id, label]) =>
      `<button class="chip ${cur === id ? 'on' : ''}" data-act="${act}" data-v="${id}">${label}</button>`
    ).join('') +
    '</div>';
}

function swatchRow(items, cur, act) {
  return '<div class="rowFlex">' +
    items.map(([id, c1, c2, title]) =>
      `<button class="sw ${cur === id ? 'on' : ''}" data-act="${act}" data-v="${id}" title="${title || ''}" style="background:linear-gradient(135deg,${c1} 50%,${c2} 50%)"></button>`
    ).join('') +
    '</div>';
}

function hexRow(label, id, val) {
  return `<div class="hexRow"><span class="hexLabel">${label}</span><input type="color" class="hexInput" id="${id}" value="${val || '#000000'}"></div>`;
}

const PROFILE_ICONS = {
  cherry: 'M6 19 L10 9 Q20 6.2 30 9 L34 19 Z',
  oem: 'M6 19 L9 7 Q20 4.6 31 7 L34 19 Z',
  xda: 'M5 19 L8 10.5 Q20 9 32 10.5 L35 19 Z',
  sa: 'M7 19 L10 6 Q20 2.4 30 6 L33 19 Z',
  dsa: 'M5 19 L9 11 Q20 10 31 11 L35 19 Z',
  mt3: 'M7 19 L10 5 Q20 1.8 30 5 L33 19 Z',
  asa: 'M6 19 L10 8 Q20 5.5 30 8 L34 19 Z',
};

const PANELS = {
  layout: () => `
<div class="grp"><div class="glabel">SIZE</div>${chipRow(
    Object.entries(LAYOUTS).map(([id, l]) => [id, l.pct]),
    state.layout, 'layout',
  )}</div>
<div class="grp"><div class="glabel">${LAYOUTS[state.layout].name}</div><div class="hint">${LAYOUTS[state.layout].tag}</div></div>`,

  keycaps: () => {
    const cw = effectiveColorway();
    const cc = state.customColors;
    return `
<div class="preview">${[
  { w: 1.1, h: 1.1, x: 38, y: 24, c: cw.m.bg, f: cw.m.fg, l: 'TAB' },
  { w: 1.1, h: 1.1, x: 86, y: 24, c: cw.a.bg, f: cw.a.fg, l: 'Q' },
  { w: 1.1, h: 1.1, x: 134, y: 24, c: cw.x.bg, f: cw.x.fg, l: 'S' },
  { w: 1.9, h: 0.45, x: 18, y: 106, c: cw.m.bg, f: cw.m.fg, l: 'MODKEYS' },
].map(k => `<div class="kc" style="left:${k.x}px;top:${k.y}px;width:${k.w * 48}px;height:${k.h * 46}px;background:${k.c};color:${k.f}"><div class="kctop">${k.l}</div></div>`).join('')}</div>
<div class="grp"><div class="glabel">PROFILE</div>${Object.entries(PROFILES).map(([id, p]) =>
  `<button class="profBtn ${state.profile === id ? 'on' : ''}" data-act="profile" data-v="${id}"><svg width="40" height="22" viewBox="0 0 40 22"><path d="${PROFILE_ICONS[id]}" fill="currentColor"/></svg></button>`
).join('')}</div>
<div class="grp"><div class="glabel">MATERIAL</div>${chipRow(
    Object.entries(MATERIALS).map(([id, m]) => [id, m.name]),
    state.material, 'material',
  )}</div>
<div class="grp"><div class="glabel">COLORWAY</div>${swatchRow(
    PANEL_SWATCHES.map(id => [id, COLORWAYS[id].a.bg, COLORWAYS[id].m.bg, COLORWAYS[id].name]),
    (state.customColors ? '__custom__' : state.colorway), 'colorway',
  )}</div>
<div class="grp" style="margin-top:4px"><button class="libBtn" id="libOpen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20l4-4m0 0l4 4m-4-4V4" stroke-linecap="round"/></svg>View Keycap Library</button></div>
<div class="grp"><div class="glabel">CUSTOM COLORS</div>
<div class="hexGrid">
  <div class="hexCol"><div class="hexTitle">Alpha</div>${hexRow('BG', 'hexAbg', (cc && cc.a.bg) || cw.a.bg)}${hexRow('FG', 'hexAfg', (cc && cc.a.fg) || cw.a.fg)}</div>
  <div class="hexCol"><div class="hexTitle">Mod</div>${hexRow('BG', 'hexMbg', (cc && cc.m.bg) || cw.m.bg)}${hexRow('FG', 'hexMfg', (cc && cc.m.fg) || cw.m.fg)}</div>
  <div class="hexCol"><div class="hexTitle">Accent</div>${hexRow('BG', 'hexXbg', (cc && cc.x.bg) || cw.x.bg)}${hexRow('FG', 'hexXfg', (cc && cc.x.fg) || cw.x.fg)}</div>
</div>
<button class="libBtn" id="applyCustomColors" style="margin-top:6px">Apply Custom Colors</button>
<button class="libBtn" id="clearCustomColors" style="margin-top:4px">Reset to Colorway</button>
</div>
<div class="grp" style="margin-top:12px;border-top:1px solid var(--card2);padding-top:12px">
  <div class="glabel">KEY IMAGE</div>
  <div class="hint">Double-click a key to select it, then upload an image below.</div>
  <input type="file" id="keImageSidebar" accept="image/png,image/jpeg" class="keFile">
  <div class="keHint">PNG or JPG &middot; max 25 MB</div>
  <div id="keSidebarPreview"></div>
</div>`;
  },

  switches: () => `
<div class="glabel">SWITCH TYPE</div>${chipRow(
    Object.entries(SWITCHES).map(([id, s]) => [id, s.name]),
    state.sw, 'sw',
  )}
<div class="hint" style="margin-top:10px">${SWITCHES[state.sw].type} · ${SWITCHES[state.sw].force} · ${SWITCHES[state.sw].sound} sound · Double-click any key on the board to customize it.</div>`,

  case: () => `
<div class="glabel">COLOR</div>${swatchRow(
    Object.entries(CASES).map(([id, c]) => [id, c.c, c.c, c.name]),
    state.caseColor, 'caseColor',
  )}
<div class="glabel" style="margin-top:16px">FINISH</div>${chipRow(
    Object.entries(FINISHES).map(([id, f]) => [id, f.name]),
    state.finish, 'finish',
  )}`,

  plate: () => `
<div class="glabel">MATERIAL</div>${chipRow(
    Object.entries(PLATES).map(([id, p]) => [id, p.name]),
    state.plate, 'plate',
  )}
<div class="hint" style="margin-top:10px">${PLATES[state.plate].tag}</div>`,

  lighting: () => `
<div class="glabel">MODE</div>${chipRow([
  ['wave', 'Wave'], ['static', 'Static'], ['breathe', 'Breathe'], ['off', 'Off'],
], state.light.mode, 'lightMode')}
<div class="glabel" style="margin-top:16px">COLOR</div>${swatchRow(
    LIGHT_COLORS.map(c => [c, c, c]),
    state.light.mode === 'off' ? '' : state.light.color, 'lightColor',
  )}
<div class="glabel" style="margin-top:16px">BRIGHTNESS</div>
<input type="range" class="slider" id="brightSlider" min="0" max="1.5" step="0.02" value="${state.light.bright}">`,

  extras: () => {
    let html = '<div class="glabel">ACCESSORIES</div>';
    for (const [id, e] of Object.entries(EXTRAS)) {
      const on = state.extras[id];
      html += `<div class="togRow">
<div><div class="t1">${e.name}</div><div class="t2">${e.tag}</div></div>
<button class="tog ${on ? 'on' : ''}" data-act="extras" data-v="${id}"></button></div>`;
    }
    return html;
  },
};

export function renderPanel(section) {
  state.section = section;
  document.querySelectorAll('.snav button').forEach((b) =>
    b.classList.toggle('on', b.dataset.sec === section),
  );
  $('panelTitle').textContent = section.toUpperCase();
  $('panelBody').innerHTML = PANELS[section] ? PANELS[section]() : '';
  const sl = document.querySelector('#brightSlider');
  if (sl) {
    sl.oninput = () => {
      setState({ light: { bright: parseFloat(sl.value) } });
    };
  }
}

/* key editor popover */
let _currentEditId = null;

function updateSidebarKeyImage() {
  const preview = $('keSidebarPreview');
  if (!preview) return;
  if (_currentEditId) {
    const ov = getOverride(_currentEditId);
    preview.innerHTML = ov?.imageData
      ? `<img src="${ov.imageData}" class="kePreview" style="margin-top:6px"><button id="keRemoveImgSidebar" class="keBtn" style="margin-top:4px">Remove Image</button>`
      : '';
  } else {
    preview.innerHTML = '';
  }
}

export function showKeyEditor(keyData) {
  _currentEditId = keyData.perKeyId;
  const ov = getOverride(_currentEditId) || {};
  const defaultLabel = keyData.label || getKeyLabel(keyData.perKeyId) || '';
  const html = `
<div class="keHead">
  <span>Key ${_currentEditId}</span>
  <button id="keClose" class="keBtn">✕</button>
</div>
<div class="keBody">
  <div class="keRow"><label>Text</label><input type="text" id="keText" value="${(ov.customText !== undefined ? ov.customText : defaultLabel).replace(/"/g, '&quot;')}" class="keInput"></div>
  <div class="keRow"><label>Font size</label><input type="range" id="keFs" min="12" max="48" value="${ov.fontSize || 29}" class="keSlider"></div>
  <div class="keRow"><label>FG color</label><input type="color" id="keFg" value="${ov.fgColor || '#000000'}" class="keColor"></div>
  <div class="keRow"><label>BG color</label><input type="color" id="keBg" value="${ov.bgColor || '#ffffff'}" class="keColor"></div>
  <div class="keRow"><label>Glow text</label><label class="keToggle ${ov.glow ? 'on' : ''}" id="keGlow"><span></span></label></div>
  <div class="keRow"><label>Image behind text</label><label class="keToggle ${ov.imageBehindText ? 'on' : ''}" id="keImgBehind"><span></span></label></div>
  <div class="keRow"><label>Image</label><input type="file" id="keImage" accept="image/png,image/jpeg" class="keFile"></div>
  <div class="keHint">PNG or JPG &middot; max 25 MB</div>
  ${ov.imageData ? `<div class="keRow"><label></label><img src="${ov.imageData}" class="kePreview"><button id="keRemoveImg" class="keBtn">Remove</button></div>` : ''}
  <div class="keRow" style="margin-top:12px"><button id="keReset" class="keBtn">Reset to default</button></div>
</div>`;

  const pop = $('keyEditor');
  if (!pop) return;
  pop.innerHTML = html;
  pop.classList.add('open');
  $('panelBody').classList.add('keOpen');
  updateSidebarKeyImage();
}

export function hideKeyEditor() {
  const pop = $('keyEditor');
  if (pop) pop.classList.remove('open');
  $('panelBody').classList.remove('keOpen');
  _currentEditId = null;
  state.selectedKey = null;
  updateSidebarKeyImage();
}

export function setupPanelEvents() {
  const panelBody = $('panelBody');
  if (!panelBody) return;

  panelBody.addEventListener('click', (ev) => {
    const chip = ev.target.closest('[data-act]');
    if (chip) {
      const act = chip.dataset.act, v = chip.dataset.v;
      if (act === 'layout') { setState({ layout: v, selectedPreset: null }); return; }
      if (act === 'profile') { setState({ profile: v }); return; }
      if (act === 'material') { setState({ material: v }); return; }
      if (act === 'colorway') { setState({ colorway: v, selectedPreset: null, customColors: null }); return; }
      if (act === 'sw') { setState({ sw: v, selectedPreset: null }); return; }
      if (act === 'caseColor') { setState({ caseColor: v }); return; }
      if (act === 'finish') { setState({ finish: v }); return; }
      if (act === 'plate') { setState({ plate: v }); return; }
      if (act === 'lightMode') { setState({ light: { mode: v } }); return; }
      if (act === 'lightColor') { setState({ light: { color: v } }); return; }
      if (act === 'extras') { const e = {}; e[v] = !state.extras[v]; setState({ extras: e }); return; }
      return;
    }
    if (ev.target.id === 'applyCustomColors') {
      const cc = {
        a: { bg: $('hexAbg').value, fg: $('hexAfg').value },
        m: { bg: $('hexMbg').value, fg: $('hexMfg').value },
        x: { bg: $('hexXbg').value, fg: $('hexXfg').value },
      };
      setState({ customColors: cc });
      return;
    }
    if (ev.target.id === 'clearCustomColors') {
      setState({ colorway: state.colorway, customColors: null });
      return;
    }
    if (ev.target.id === 'keRemoveImgSidebar' && _currentEditId) {
      const ov = getOverride(_currentEditId) || {};
      delete ov.imageData;
      setOverride(_currentEditId, { imageData: null });
      rebuildKey(..._currentEditId.split('-').map(Number));
      updateSidebarKeyImage();
      return;
    }
  });
  panelBody.addEventListener('change', async (ev) => {
    if (!_currentEditId) return;
    if (ev.target.id === 'keImageSidebar') {
      const file = ev.target.files[0];
      if (!file) return;
      const err = validateImageFile(file);
      if (err) { toast(err); ev.target.value = ''; return; }
      const dataUrl = await loadImage(file);
      setOverride(_currentEditId, { imageData: dataUrl });
      rebuildKey(..._currentEditId.split('-').map(Number));
      updateSidebarKeyImage();
    }
  });

  const ke = $('keyEditor');
  if (!ke) return;

  ke.addEventListener('click', (ev) => {
    if (ev.target.closest('#keReset') && _currentEditId) {
      clearOverride(_currentEditId);
      rebuildKey(..._currentEditId.split('-').map(Number));
      hideKeyEditor();
      return;
    }
    if (ev.target.closest('#keRemoveImg') && _currentEditId) {
      setOverride(_currentEditId, { imageData: null });
      rebuildKey(..._currentEditId.split('-').map(Number));
      showKeyEditor({ perKeyId: _currentEditId });
      return;
    }
    if (ev.target.closest('#keGlow') && _currentEditId) {
      const ov = getOverride(_currentEditId) || {};
      setOverride(_currentEditId, { glow: !ov.glow });
      rebuildKey(..._currentEditId.split('-').map(Number));
      const el = $('keGlow');
      if (el) el.classList.toggle('on');
      return;
    }
    if (ev.target.closest('#keImgBehind') && _currentEditId) {
      const ov = getOverride(_currentEditId) || {};
      setOverride(_currentEditId, { imageBehindText: !ov.imageBehindText });
      rebuildKey(..._currentEditId.split('-').map(Number));
      const el = $('keImgBehind');
      if (el) el.classList.toggle('on');
      return;
    }
    if (ev.target.closest('#keClose')) {
      hideKeyEditor();
    }
  });
  ke.addEventListener('input', (ev) => {
    if (!_currentEditId) return;
    const id = ev.target.id;
    if (id === 'keText' || id === 'keFs' || id === 'keFg' || id === 'keBg') {
      const patch = {};
      if (id === 'keText') patch.customText = ev.target.value || '';
      if (id === 'keFs') patch.fontSize = parseInt(ev.target.value);
      if (id === 'keFg') patch.fgColor = ev.target.value;
      if (id === 'keBg') patch.bgColor = ev.target.value;
      setOverride(_currentEditId, patch);
      rebuildKey(..._currentEditId.split('-').map(Number));
    }
  });
  ke.addEventListener('change', async (ev) => {
    if (!_currentEditId) return;
    if (ev.target.id === 'keImage') {
      const file = ev.target.files[0];
      if (!file) return;
      const err = validateImageFile(file);
      if (err) { toast(err); ev.target.value = ''; return; }
      const dataUrl = await loadImage(file);
      setOverride(_currentEditId, { imageData: dataUrl });
      rebuildKey(..._currentEditId.split('-').map(Number));
      showKeyEditor({ perKeyId: _currentEditId });
    }
  });
}
