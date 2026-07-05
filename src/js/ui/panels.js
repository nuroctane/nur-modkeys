import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS, PANEL_SWATCHES } from '../data/colorways.js';
import { CASES, FINISHES, PLATES, SWITCHES, MATERIALS, EXTRAS, PROFILES, LIGHT_COLORS } from '../data/components.js';
import { setState } from '../core/update.js';

const $ = (id) => document.getElementById(id);

export function lightDotStyle() {
  if (state.light.mode === 'off') return 'background:#3f3f45';
  if (state.light.mode === 'wave')
    return 'background:conic-gradient(#ff5e5e,#ffb35e,#5fd68b,#4ea1ff,#8a7bff,#ff5ea8,#ff5e5e)';
  return 'background:' + state.light.color;
}

export function syncUI(skipPanel) {
  const cw = COLORWAYS[state.colorway];
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

const PROFILE_ICONS = {
  cherry: 'M6 19 L10 9 Q20 6.2 30 9 L34 19 Z',
  oem: 'M6 19 L9 7 Q20 4.6 31 7 L34 19 Z',
  xda: 'M5 19 L8 10.5 Q20 9 32 10.5 L35 19 Z',
  sa: 'M7 19 L10 6 Q20 2.4 30 6 L33 19 Z',
};

const PANELS = {
  layout: () => `
<div class="grp"><div class="glabel">SIZE</div>${chipRow(
    Object.entries(LAYOUTS).map(([id, l]) => [id, l.pct]),
    state.layout, 'layout',
  )}</div>
<div class="grp"><div class="glabel">${LAYOUTS[state.layout].name}</div><div class="hint">${LAYOUTS[state.layout].tag}</div></div>`,

  keycaps: () => {
    const cw = COLORWAYS[state.colorway];
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
    state.colorway, 'colorway',
  )}</div>
<div class="grp" style="margin-top:4px"><button class="libBtn" id="libOpen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20l4-4m0 0l4 4m-4-4V4" stroke-linecap="round"/></svg>View Keycap Library</button></div>`;
  },

  switches: () => `
<div class="glabel">SWITCH TYPE</div>${chipRow(
    Object.entries(SWITCHES).map(([id, s]) => [id, s.name]),
    state.sw, 'sw',
  )}
<div class="hint" style="margin-top:10px">${SWITCHES[state.sw].type} · ${SWITCHES[state.sw].force} · ${SWITCHES[state.sw].sound} sound · Click any key on the board to hear it.</div>`,

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
  /* brightness slider listener */
  const sl = document.querySelector('#brightSlider');
  if (sl) {
    sl.oninput = () => {
      setState({ light: { bright: parseFloat(sl.value) } });
    };
  }
}

/* panel event delegation */
$('panelBody').addEventListener('click', (ev) => {
  const chip = ev.target.closest('[data-act]');
  if (!chip) return;
  const act = chip.dataset.act, v = chip.dataset.v;
  if (act === 'layout') { setState({ layout: v, selectedPreset: null }); return; }
  if (act === 'profile') { setState({ profile: v }); return; }
  if (act === 'material') { setState({ material: v }); return; }
  if (act === 'colorway') { setState({ colorway: v, selectedPreset: null }); return; }
  if (act === 'sw') { setState({ sw: v, selectedPreset: null }); return; }
  if (act === 'caseColor') { setState({ caseColor: v }); return; }
  if (act === 'finish') { setState({ finish: v }); return; }
  if (act === 'plate') { setState({ plate: v }); return; }
  if (act === 'lightMode') { setState({ light: { mode: v } }); return; }
  if (act === 'lightColor') { setState({ light: { color: v } }); return; }
  if (act === 'extras') { const e = {}; e[v] = !state.extras[v]; setState({ extras: e }); return; }
});
