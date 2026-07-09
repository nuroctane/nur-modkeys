import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS, PANEL_SWATCHES } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, EXTRAS, PROFILES, LIGHT_COLORS } from '../data/components.js';
import { setState, effectiveColorway, applyLight } from '../core/update.js';
import {
  getOverride, setOverride, setOverrides, clearOverride, clearAllOverrides,
  getSelectedIds, selectKey, clearSelection,
} from '../core/perKey.js';
import { loadImage, validateImageFile } from '../core/imageLoader.js';
import { EMOJI, emojiUrl } from '../data/art.js';
import { rebuildKey, getKeyLabel, updateKeyLegend, updateSelectionChrome } from '../core/keyboard.js';
import { applyPlateFinish, matCase, matStem, sRGB } from '../core/scene.js';
import { toast } from './toast.js';
import {
  loadPhotoFile, hasPhotoSession, photoPreviewUrl,
  copyColorsFromPhoto, setCornerFromPreview, cornersInPreview, clearPhotoSession,
  analyzePhotoSession, photoRolesStatePatch, photoPartStatePatch,
  getPhotoMatchMeta, getPhotoApply, setPhotoApply,
} from '../core/photoMatch.js';

function effectiveCaseHex() {
  return state.caseCustomColor || CASES[state.caseColor].c;
}
function effectiveSwitchHex() {
  return state.switchColor || SWITCHES[state.sw].dot;
}

const $ = (id) => document.getElementById(id);

function selectedOrPrimary() {
  const ids = getSelectedIds();
  if (ids.length) return ids;
  if (_currentEditId) return [_currentEditId];
  return [];
}

/** Apply a key-editor field patch to all selected keys. */
function applyKeyEditorPatch(patch, { fullRebuild = false } = {}) {
  const ids = selectedOrPrimary();
  if (!ids.length) return;
  setOverrides(ids, patch);
  const needRebuild = fullRebuild || patch.bgColor !== undefined;
  ids.forEach((id) => {
    if (needRebuild) rebuildKey(...id.split('-').map(Number));
    else updateKeyLegend(id);
  });
}

export function lightDotStyle() {
  if (state.light.mode === 'off') return 'background:#3f3f45';
  if (state.light.mode === 'wave')
    return 'background:conic-gradient(#ff5e5e,#ffb35e,#5fd68b,#4ea1ff,#8a7bff,#ff5ea8,#ff5e5e)';
  return 'background:' + state.light.color;
}

export function syncUI(skipPanel) {
  const cw = effectiveColorway();
  $('dotKeycaps').style.background = cw.a.bg;
  $('dotSwitches').style.background = effectiveSwitchHex();
  $('dotCase').style.background = effectiveCaseHex();
  $('dotPlate').style.background = state.plateColor || PLATES[state.plate].c;
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
<div class="hint" style="margin-top:10px">${SWITCHES[state.sw].type} · ${SWITCHES[state.sw].force} · ${SWITCHES[state.sw].sound} sound · Double-click any key on the board to customize it.</div>
<div class="glabel" style="margin-top:16px">STEM COLOR</div>
<div class="keRow" style="margin-top:6px">
  <label>Stem</label>
  <input type="color" id="switchColor" class="keColor" value="${effectiveSwitchHex()}">
  <button type="button" class="keBtn" id="switchColorReset" title="Reset to switch default">Default</button>
</div>
<div class="hint" style="margin-top:6px">Default for ${SWITCHES[state.sw].name}: ${SWITCHES[state.sw].dot}</div>`,

  case: () => `
<div class="glabel">PRESET</div>${swatchRow(
    Object.entries(CASES).map(([id, c]) => [id, c.c, c.c, c.name]),
    state.caseColor, 'caseColor',
  )}
<div class="glabel" style="margin-top:16px">CUSTOM COLOR</div>
<div class="keRow" style="margin-top:6px">
  <label>Case</label>
  <input type="color" id="caseCustomColor" class="keColor" value="${effectiveCaseHex()}">
  <button type="button" class="keBtn" id="caseColorReset" title="Reset to preset">Default</button>
</div>
<div class="hint" style="margin-top:6px">Default for ${CASES[state.caseColor].name}: ${CASES[state.caseColor].c}</div>
<div class="glabel" style="margin-top:16px">FINISH</div>${chipRow(
    Object.entries(FINISHES).map(([id, f]) => [id, f.name]),
    state.finish, 'finish',
  )}`,

  plate: () => {
    const pl = PLATES[state.plate];
    const hex = state.plateColor || pl.c;
    return `
<div class="glabel">MATERIAL</div>${chipRow(
    Object.entries(PLATES).map(([id, p]) => [id, p.name]),
    state.plate, 'plate',
  )}
<div class="hint" style="margin-top:10px">${pl.tag} · texture stays with material; color tints it</div>
<div class="glabel" style="margin-top:16px">COLOR</div>
<div class="keRow" style="margin-top:6px">
  <label>Plate</label>
  <input type="color" id="plateColor" class="keColor" value="${hex}">
  <button type="button" class="keBtn" id="plateColorReset" title="Reset to material default">Default</button>
</div>
<div class="hint" style="margin-top:6px">Default for ${pl.name}: ${pl.c}</div>`;
  },

  lighting: () => `
<div class="glabel">MODE</div>${chipRow([
  ['wave', 'Wave'], ['static', 'Static'], ['breathe', 'Breathe'], ['off', 'Off'],
], state.light.mode, 'lightMode')}
<div class="glabel" style="margin-top:16px">COLOR</div>${swatchRow(
    LIGHT_COLORS.map(c => [c, c, c]),
    state.light.mode === 'off' ? '' : state.light.color, 'lightColor',
  )}
<div class="keRow" style="margin-top:10px">
  <label>Custom</label>
  <input type="color" id="lightCustomColor" class="keColor" value="${state.light.color}">
</div>
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

  customize: () => buildCustomizePanel(),
};

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildCustomizePanel() {
  const ids = getSelectedIds();
  const primary = ids[ids.length - 1] || null;
  const ov = primary ? (getOverride(primary) || {}) : {};
  const defaultLabel = primary ? (getKeyLabel(primary) || '') : '';
  const labelVal = ov.customText !== undefined ? ov.customText : defaultLabel;
  const fit = ov.imageFit || (ov.imageBehindText ? 'fill' : 'wrap');
  const hasPhoto = hasPhotoSession();

  const meta = hasPhoto ? getPhotoMatchMeta() : null;
  const apply = getPhotoApply();
  const a = meta?.assign;
  const roleStrip = a
    ? `<div class="photoRoleStrip" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        ${[
          ['α', a.alpha],
          ['mod', a.mod],
          ['acc', a.accent],
          ['case', a.caseC],
          ['plate', a.plate],
          ['sw', a.switch],
          ['glow', a.glow],
        ].map(([lab, hex]) =>
          `<span title="${lab}" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;opacity:.85">
            <i style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${escAttr(hex || '#888')};border:1px solid var(--card2)"></i>${lab}
          </span>`).join('')}
      </div>`
    : '';

  const photoToggleRow = (id, label, hex) => `
  <label class="keRow" style="margin-top:6px">
    <span style="display:inline-flex;align-items:center;gap:6px;flex:1;min-width:0">
      <i style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${escAttr(hex || '#888')};border:1px solid var(--card2);flex-shrink:0"></i>
      ${label}
    </span>
    <label class="keToggle ${apply[id] ? 'on' : ''}" id="photoApply_${id}" data-photo-apply="${id}"><span></span></label>
  </label>`;

  const boardToggles = a ? `
  <div class="glabel" style="margin-top:12px">BOARD FROM PHOTO</div>
  <div class="hint">Toggle which parts take colours from the photo (same as keys). On = apply / re-apply on copy.</div>
  ${photoToggleRow('case', 'Case', a.caseC)}
  ${photoToggleRow('plate', 'Plate', a.plate)}
  ${photoToggleRow('light', 'Light', a.glow)}
  ${photoToggleRow('switch', 'Switch', a.switch)}
  ${photoToggleRow('keys', 'Keycaps', a.alpha)}
  ` : '';

  let html = `
<div class="grp">
  <div class="glabel">MATCH A PHOTO</div>
  <div class="hint">Upload any photo — keyboard, art, landscape, anything. We sample colours (and auto-detect a board if present), then apply them to keys and board parts. Drag corners to fine-tune. PNG or JPG · max 25 MB.</div>
  <label class="libBtn" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-top:6px">
    Upload photo…
    <input type="file" id="photoMatchFile" accept="image/png,image/jpeg" style="display:none">
  </label>
  <div class="hint" style="margin-top:4px">PNG or JPG &middot; max 25 MB</div>
  ${hasPhoto ? `
  <div id="photoMatchWrap" class="photoMatchWrap">
    <img id="photoMatchImg" class="photoMatchImg" src="${photoPreviewUrl()}" alt="Photo match" draggable="false">
    <div id="photoMatchHandles" class="photoMatchHandles"></div>
  </div>
  ${roleStrip}
  ${boardToggles}
  <button type="button" class="libBtn" id="photoCopyAll" style="margin-top:8px">Copy every key</button>
  <button type="button" class="libBtn" id="photoCopySel" style="margin-top:4px">Copy selected only</button>
  <button type="button" class="libBtn" id="photoRecopy" style="margin-top:4px">Re-copy from photo</button>
  <button type="button" class="libBtn" id="photoAutofit" style="margin-top:4px">Auto-fit board</button>
  <button type="button" class="keBtn" id="photoClear" style="margin-top:4px">Clear photo</button>
  ` : ''}
</div>
<div class="grp" style="margin-top:12px">
  <div class="glabel">SELECTION</div>
  <div class="hint">${ids.length
    ? `Editing <strong>${ids.length}</strong> key${ids.length > 1 ? 's' : ''}${primary ? ` (primary ${primary})` : ''}`
    : 'Click a key on the board. <strong>Shift+click</strong> (desktop) or enable Multi (mobile) to select several.'}</div>
  <label class="keRow" style="margin-top:8px"><span>Multi-select mode</span>
    <label class="keToggle ${state.multiSelectMode ? 'on' : ''}" id="multiSelectToggle"><span></span></label>
  </label>
  <button type="button" class="keBtn" id="selClear" style="margin-top:6px">Clear selection</button>
</div>`;

  if (!ids.length) {
    html += `<div class="hint" style="margin-top:16px">Select a key to edit colours, legends, emoji, and images.</div>
<button type="button" class="libBtn" id="resetAllKeys" style="margin-top:12px">Reset all custom keys</button>`;
    return html;
  }

  const bg = ov.bgColor || '#cccccc';
  const fg = ov.fgColor || '#000000';
  html += `
<div class="grp" style="margin-top:14px;border-top:1px solid var(--card2);padding-top:12px">
  <div class="glabel">KEYCAP COLOUR</div>
  <div class="keRow">
    <input type="color" id="cuBg" class="keColor" value="${escAttr(bg)}">
    <button type="button" class="keBtn" id="cuUseColorway">Use colorway</button>
  </div>
  <div class="glabel" style="margin-top:12px">LEGEND TEXT</div>
  <input type="text" id="cuText" class="keInput" value="${escAttr(labelVal)}" style="width:100%;margin-top:4px">
  <div class="keRow" style="margin-top:8px">
    <label>Label shown</label>
    <label class="keToggle ${ov.labelHidden ? '' : 'on'}" id="cuLabelShown"><span></span></label>
  </div>
  <div class="hint">Show or hide this key’s legend text</div>
  <div class="glabel" style="margin-top:12px">LEGEND COLOUR</div>
  <div class="keRow">
    <input type="color" id="cuFg" class="keColor" value="${escAttr(fg)}">
    <button type="button" class="keBtn" id="cuFgAuto">Auto</button>
  </div>
  <div class="keRow" style="margin-top:8px"><label>Font size</label>
    <input type="range" id="cuFs" min="12" max="48" value="${ov.fontSize || 29}" class="keSlider"></div>
  <div class="keRow"><label>Glow text</label>
    <label class="keToggle ${ov.glow ? 'on' : ''}" id="cuGlow"><span></span></label></div>
  <div class="glabel" style="margin-top:14px">EMOJI / IMAGE</div>
  <div class="hint" style="margin-top:2px">Pick an emoji for this key. Click again or <strong>None</strong> to restore legend text.</div>
  <div class="emojiGrid" id="emojiGrid">
    <button type="button" class="emojiBtn emojiBtnNone ${!ov.markId ? 'on' : ''}" data-emoji-clear="1" title="No emoji — show text">None</button>
    ${Object.keys(EMOJI).map((id) =>
      `<button type="button" class="emojiBtn ${ov.markId === id ? 'on' : ''}" data-emoji="${id}" title="${id}">
        <img src="${emojiUrl(EMOJI[id])}" alt="${id}" width="22" height="22"></button>`).join('')}
  </div>
  <div class="keRow" style="margin-top:8px">
    <label class="libBtn" style="cursor:pointer;flex:1;text-align:center">Upload image…
      <input type="file" id="cuImage" accept="image/png,image/jpeg,image/webp" style="display:none">
    </label>
    <button type="button" class="keBtn" id="cuRemoveArt">Remove art</button>
  </div>
  ${ov.imageData ? `<img src="${ov.imageData}" class="kePreview" style="margin-top:8px;max-width:100%">` : ''}
  <div class="glabel" style="margin-top:12px">IMAGE FIT</div>
  <div class="rowFlex" style="margin-top:4px">
    ${['wrap', 'fill', 'sticker'].map((f) =>
      `<button type="button" class="chip ${fit === f ? 'on' : ''}" data-fit="${f}">${
        f === 'wrap' ? 'Wrap key' : f === 'fill' ? 'Fill top' : 'Sticker'
      }</button>`).join('')}
  </div>
  <div class="hint" style="margin-top:4px">Wrap = full face · Fill = under text · Sticker = small centre</div>
  <button type="button" class="keBtn" id="cuResetOne" style="margin-top:14px">Reset this key${ids.length > 1 ? 's' : ''}</button>
  <button type="button" class="libBtn" id="resetAllKeys" style="margin-top:6px">Reset all custom keys</button>
</div>`;
  return html;
}

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
  if (section === 'customize') mountPhotoHandles();
}

/* key editor � opens Customize section (rich panel + multi-select) */
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

export function showKeyEditor(keyData, opts = {}) {
  const id = keyData.perKeyId || keyData;
  const multi = !!(opts.multi || state.multiSelectMode || opts.shiftKey);
  selectKey(id, { multi });
  _currentEditId = state.selectedKey;
  updateSelectionChrome();
  const pop = $('keyEditor');
  if (pop) pop.classList.remove('open');
  $('panelBody')?.classList.remove('keOpen');
  renderPanel('customize');
}

export function hideKeyEditor() {
  const pop = $('keyEditor');
  if (pop) pop.classList.remove('open');
  $('panelBody')?.classList.remove('keOpen');
  _currentEditId = null;
  clearSelection();
  updateSelectionChrome();
  updateSidebarKeyImage();
}

export function refreshCustomizeIfOpen() {
  if (state.section === 'customize') renderPanel('customize');
  updateSelectionChrome();
}

function mountPhotoHandles() {
  const wrap = $('photoMatchWrap');
  const img = $('photoMatchImg');
  const layer = $('photoMatchHandles');
  if (!wrap || !img || !layer || !hasPhotoSession()) return;

  const place = () => {
    const w = img.clientWidth || 1;
    const h = img.clientHeight || 1;
    const corners = cornersInPreview(w, h);
    layer.style.width = w + 'px';
    layer.style.height = h + 'px';
    layer.innerHTML = corners.map((c, i) =>
      `<button type="button" class="photoHandle" data-corner="${i}" style="left:${c.x}px;top:${c.y}px" aria-label="Corner ${i + 1}"></button>`,
    ).join('');
  };
  if (img.complete) place();
  else img.onload = place;

  layer.onpointerdown = (ev) => {
    const btn = ev.target.closest('.photoHandle');
    if (!btn) return;
    ev.preventDefault();
    const idx = parseInt(btn.dataset.corner, 10);
    const w = img.clientWidth;
    const h = img.clientHeight;
    const move = (e) => {
      const r = img.getBoundingClientRect();
      const px = Math.max(0, Math.min(w, e.clientX - r.left));
      const py = Math.max(0, Math.min(h, e.clientY - r.top));
      setCornerFromPreview(idx, px, py, w, h);
      btn.style.left = px + 'px';
      btn.style.top = py + 'px';
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
}

function afterPhotoCopy(msg) {
  Object.keys(state.perKeyOverrides || {}).forEach((id) => {
    if (state.perKeyOverrides[id]?.bgColor) rebuildKey(...id.split('-').map(Number));
  });
  refreshChromeDots();
  toast(msg || 'Colours copied from photo');
  renderPanel('customize');
}

/** Apply k-means roles (board toggles) then optional per-key median copy. */
function applyPhotoMatchPipeline({ recopy = true, onlySelected = false } = {}) {
  const apply = getPhotoApply();
  const patch = photoRolesStatePatch();
  if (patch) setState(patch, { skipPanel: true, animate: false });
  if (!recopy || !apply.keys) return patch ? 1 : 0;
  return copyColorsFromPhoto({ autoLegend: true, onlySelected });
}

function refreshChromeDots() {
  const dp = $('dotPlate');
  if (dp) dp.style.background = state.plateColor || PLATES[state.plate].c;
  const dc = $('dotCase');
  if (dc) dc.style.background = state.caseCustomColor || CASES[state.caseColor].c;
  const ds = $('dotSwitches');
  if (ds) ds.style.background = state.switchColor || SWITCHES[state.sw].dot;
  const dl = $('dotLight');
  if (dl) dl.style.cssText = lightDotStyle();
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
      if (act === 'sw') { setState({ sw: v, switchColor: null, selectedPreset: null }); return; }
      if (act === 'caseColor') { setState({ caseColor: v, caseCustomColor: null }); return; }
      if (act === 'finish') { setState({ finish: v }); return; }
      if (act === 'plate') { setState({ plate: v, plateColor: null }); return; }
      if (act === 'lightMode') { setState({ light: { mode: v } }); return; }
      if (act === 'lightColor') { setState({ light: { color: v } }); return; }
      if (act === 'extras') { const e = {}; e[v] = !state.extras[v]; setState({ extras: e }); return; }
      return;
    }
    if (ev.target.id === 'plateColorReset') {
      setState({ plateColor: null }, { skipPanel: true, animate: false });
      const el = $('plateColor');
      if (el) el.value = PLATES[state.plate].c;
      const dot = $('dotPlate');
      if (dot) dot.style.background = PLATES[state.plate].c;
      return;
    }
    if (ev.target.id === 'caseColorReset') {
      setState({ caseCustomColor: null }, { skipPanel: true, animate: false });
      const el = $('caseCustomColor');
      if (el) el.value = CASES[state.caseColor].c;
      const dot = $('dotCase');
      if (dot) dot.style.background = CASES[state.caseColor].c;
      return;
    }
    if (ev.target.id === 'switchColorReset') {
      setState({ switchColor: null }, { skipPanel: true, animate: false });
      const el = $('switchColor');
      if (el) el.value = SWITCHES[state.sw].dot;
      const dot = $('dotSwitches');
      if (dot) dot.style.background = SWITCHES[state.sw].dot;
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
    /* ── Customize panel ───────────────────────────────────── */
    if (ev.target.id === 'multiSelectToggle' || ev.target.closest('#multiSelectToggle')) {
      state.multiSelectMode = !state.multiSelectMode;
      renderPanel('customize');
      toast(state.multiSelectMode ? 'Multi-select on — tap keys to add' : 'Multi-select off');
      return;
    }
    if (ev.target.id === 'selClear') {
      clearSelection();
      _currentEditId = null;
      updateSelectionChrome();
      renderPanel('customize');
      return;
    }
    if (ev.target.id === 'resetAllKeys') {
      clearAllOverrides();
      clearSelection();
      state.perKeyOverrides = {};
      import('../core/keyboard.js').then((k) => {
        if (k.buildKeys) k.buildKeys();
      });
      toast('All custom keys reset');
      renderPanel('customize');
      return;
    }
    if (ev.target.id === 'cuUseColorway') {
      applyKeyEditorPatch({ bgColor: null });
      selectedOrPrimary().forEach((id) => {
        const o = getOverride(id);
        if (o) { delete o.bgColor; setOverride(id, o); }
        rebuildKey(...id.split('-').map(Number));
      });
      renderPanel('customize');
      return;
    }
    if (ev.target.id === 'cuLabelShown' || ev.target.closest('#cuLabelShown')) {
      const ids = selectedOrPrimary();
      const cur = ids[0] ? getOverride(ids[0]) : null;
      applyKeyEditorPatch({ labelHidden: !(cur && cur.labelHidden) });
      renderPanel('customize');
      return;
    }
    if (ev.target.id === 'cuGlow' || ev.target.closest('#cuGlow')) {
      const ids = selectedOrPrimary();
      const cur = ids[0] ? getOverride(ids[0]) : null;
      applyKeyEditorPatch({ glow: !(cur && cur.glow) });
      renderPanel('customize');
      return;
    }
    if (ev.target.id === 'cuFgAuto') {
      const ids = selectedOrPrimary();
      ids.forEach((id) => {
        const o = getOverride(id) || {};
        const bg = o.bgColor || '#888888';
        const n = parseInt(bg.slice(1), 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        setOverride(id, { fgColor: lum > 0.55 ? '#1a1a1a' : '#f4f4f4' });
        updateKeyLegend(id);
      });
      renderPanel('customize');
      return;
    }
    if (ev.target.id === 'cuResetOne') {
      selectedOrPrimary().forEach((id) => {
        clearOverride(id);
        rebuildKey(...id.split('-').map(Number));
      });
      toast('Key reset');
      renderPanel('customize');
      return;
    }
    if (ev.target.id === 'cuRemoveArt') {
      applyKeyEditorPatch({ imageData: null, markId: null });
      selectedOrPrimary().forEach((id) => {
        const o = getOverride(id);
        if (o) { delete o.imageData; delete o.markId; setOverride(id, o); }
        rebuildKey(...id.split('-').map(Number));
      });
      renderPanel('customize');
      return;
    }
    const clearKeyEmoji = () => {
      const ids = selectedOrPrimary();
      ids.forEach((id) => {
        const o = getOverride(id) || {};
        delete o.markId;
        delete o.labelHidden;
        if (!Object.keys(o).length) clearOverride(id);
        else {
          /* replace store entry without re-adding nulls via setOverride */
          state.perKeyOverrides[id] = o;
        }
        rebuildKey(...id.split('-').map(Number));
      });
      toast('Emoji cleared — legend text restored');
      renderPanel('customize');
    };
    const emojiClear = ev.target.closest('[data-emoji-clear]');
    if (emojiClear) {
      clearKeyEmoji();
      return;
    }
    const emojiBtn = ev.target.closest('[data-emoji]');
    if (emojiBtn) {
      const eid = emojiBtn.dataset.emoji;
      const ids = selectedOrPrimary();
      const primary = ids[ids.length - 1];
      const cur = primary ? (getOverride(primary) || {}).markId : null;
      /* re-click active emoji → deselect and restore text */
      if (cur && cur === eid) {
        clearKeyEmoji();
        return;
      }
      applyKeyEditorPatch({ markId: eid, labelHidden: true });
      ids.forEach((id) => rebuildKey(...id.split('-').map(Number)));
      toast('Emoji applied');
      renderPanel('customize');
      return;
    }
    const fitBtn = ev.target.closest('[data-fit]');
    if (fitBtn) {
      applyKeyEditorPatch({
        imageFit: fitBtn.dataset.fit,
        imageBehindText: fitBtn.dataset.fit === 'fill',
      });
      selectedOrPrimary().forEach((id) => updateKeyLegend(id));
      renderPanel('customize');
      return;
    }
    const photoApplyEl = ev.target.closest('[data-photo-apply]');
    if (photoApplyEl) {
      const part = photoApplyEl.dataset.photoApply;
      if (!part) return;
      const cur = getPhotoApply();
      const next = !cur[part];
      setPhotoApply({ [part]: next });
      photoApplyEl.classList.toggle('on', next);
      if (next && hasPhotoSession()) {
        if (part === 'keys') {
          const n = copyColorsFromPhoto({ autoLegend: true, onlySelected: false });
          if (n) {
            Object.keys(state.perKeyOverrides || {}).forEach((id) => {
              if (state.perKeyOverrides[id]?.bgColor) rebuildKey(...id.split('-').map(Number));
            });
            toast('Key colours from photo');
          }
        } else {
          const patch = photoPartStatePatch(part);
          if (patch) {
            setState(patch, { skipPanel: true, animate: false });
            refreshChromeDots();
            toast(`${part.charAt(0).toUpperCase() + part.slice(1)} colour from photo`);
          }
        }
      } else if (!next) {
        toast(`${part.charAt(0).toUpperCase() + part.slice(1)} photo match off`);
      }
      return;
    }
    if (ev.target.id === 'photoCopyAll' || ev.target.id === 'photoRecopy') {
      if (!hasPhotoSession()) { toast('Load a photo first'); return; }
      const n = applyPhotoMatchPipeline({ recopy: true, onlySelected: false });
      refreshChromeDots();
      if (n || getPhotoApply().case || getPhotoApply().plate) {
        afterPhotoCopy(ev.target.id === 'photoRecopy'
          ? 'Re-copied from photo'
          : 'Board copied — drag corners to fine-tune');
      } else toast('Nothing to apply — turn on toggles or load a photo');
      return;
    }
    if (ev.target.id === 'photoCopySel') {
      if (!hasPhotoSession()) { toast('Load a photo first'); return; }
      if (!getPhotoApply().keys) {
        toast('Turn on Keycaps toggle first');
        return;
      }
      const n = applyPhotoMatchPipeline({ recopy: true, onlySelected: true });
      refreshChromeDots();
      if (n) afterPhotoCopy(`Copied ${n} selected key${n > 1 ? 's' : ''}`);
      else toast('Select keys first');
      return;
    }
    if (ev.target.id === 'photoAutofit') {
      if (!hasPhotoSession()) { toast('Load a photo first'); return; }
      const res = analyzePhotoSession();
      if (!res) {
        toast("Couldn't re-detect the board");
        renderPanel('customize');
        return;
      }
      const n = applyPhotoMatchPipeline({ recopy: true, onlySelected: false });
      refreshChromeDots();
      if (n || photoRolesStatePatch()) afterPhotoCopy('Auto-fit + colours applied');
      else {
        toast('Board re-detected — drag corners then copy');
        renderPanel('customize');
      }
      return;
    }
    if (ev.target.id === 'photoClear') {
      clearPhotoSession();
      renderPanel('customize');
      return;
    }
  });
  /* Live color tints: do NOT setState on every input tick — re-rendering the
     panel kills native color pickers and floods undo. Commit on change only. */
  panelBody.addEventListener('input', (ev) => {
    const id = ev.target.id;
    const hex = ev.target.value;
    if (id === 'cuBg') {
      applyKeyEditorPatch({ bgColor: hex }, { fullRebuild: true });
      return;
    }
    if (id === 'cuFg') {
      applyKeyEditorPatch({ fgColor: hex });
      return;
    }
    if (id === 'cuText') {
      applyKeyEditorPatch({ customText: hex || '' });
      return;
    }
    if (id === 'cuFs') {
      const n = parseInt(hex, 10);
      applyKeyEditorPatch({ fontSize: Number.isFinite(n) ? n : 29 });
      return;
    }
    if (id === 'plateColor') {
      state.plateColor = hex;
      applyPlateFinish(state.plate, hex);
      const dot = $('dotPlate');
      if (dot) dot.style.background = hex;
      return;
    }
    if (id === 'caseCustomColor') {
      state.caseCustomColor = hex;
      matCase.color.copy(sRGB(hex));
      const dot = $('dotCase');
      if (dot) dot.style.background = hex;
      return;
    }
    if (id === 'switchColor') {
      state.switchColor = hex;
      matStem.color.copy(sRGB(hex));
      const dot = $('dotSwitches');
      if (dot) dot.style.background = hex;
      return;
    }
    if (id === 'lightCustomColor') {
      state.light.color = hex;
      applyLight();
      const dot = $('dotLight');
      if (dot) dot.style.cssText = lightDotStyle();
      return;
    }
    if (id === 'brightSlider') {
      const b = parseFloat(ev.target.value);
      if (!Number.isFinite(b)) return;
      state.light.bright = b;
      applyLight();
    }
  });
  panelBody.addEventListener('change', async (ev) => {
    if (ev.target.id === 'photoMatchFile') {
      const file = ev.target.files?.[0];
      if (!file) return;
      const err = validateImageFile(file);
      if (err) { toast(err); ev.target.value = ''; return; }
      try {
        await loadPhotoFile(file);
        const n = applyPhotoMatchPipeline({ recopy: true, onlySelected: false });
        refreshChromeDots();
        if (n || getPhotoMatchMeta()?.assign) {
          afterPhotoCopy('Board copied — drag corners to fine-tune the fit');
        } else {
          toast('Photo loaded — drag corners, then Copy every key');
          renderPanel('customize');
        }
      } catch {
        toast('Could not load photo');
      }
      return;
    }
    if (ev.target.id === 'cuImage') {
      const file = ev.target.files?.[0];
      if (!file) return;
      const err = validateImageFile(file);
      if (err) { toast(err); return; }
      const dataUrl = await loadImage(file);
      applyKeyEditorPatch({ imageData: dataUrl, imageFit: 'wrap' });
      selectedOrPrimary().forEach((id) => rebuildKey(...id.split('-').map(Number)));
      renderPanel('customize');
      return;
    }
    if (ev.target.id === 'cuBg') {
      setState({ perKeyOverrides: state.perKeyOverrides }, { skipPanel: true, animate: false });
      return;
    }
    if (ev.target.id === 'plateColor') {
      setState({ plateColor: ev.target.value }, { skipPanel: true, animate: false });
      return;
    }
    if (ev.target.id === 'caseCustomColor') {
      setState({ caseCustomColor: ev.target.value }, { skipPanel: true, animate: false });
      return;
    }
    if (ev.target.id === 'switchColor') {
      setState({ switchColor: ev.target.value }, { skipPanel: true, animate: false });
      return;
    }
    if (ev.target.id === 'lightCustomColor') {
      setState({ light: { color: ev.target.value } }, { skipPanel: true, animate: false });
      return;
    }
    if (ev.target.id === 'brightSlider') {
      const b = parseFloat(ev.target.value);
      if (Number.isFinite(b)) setState({ light: { bright: b } }, { skipPanel: true, animate: false });
      return;
    }
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
    if (id === 'keText') {
      applyKeyEditorPatch({ customText: ev.target.value || '' });
    } else if (id === 'keFs') {
      const n = parseInt(ev.target.value, 10);
      applyKeyEditorPatch({ fontSize: Number.isFinite(n) ? n : 29 });
    } else if (id === 'keFg') {
      applyKeyEditorPatch({ fgColor: ev.target.value });
    } else if (id === 'keBg') {
      applyKeyEditorPatch({ bgColor: ev.target.value }, { fullRebuild: true });
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
