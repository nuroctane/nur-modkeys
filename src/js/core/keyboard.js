import * as THREE from 'three';
import { LAYOUTS } from '../data/layouts.js';
import { COLORWAYS } from '../data/colorways.js';
import { PROFILES, SWITCHES, GAP } from '../data/components.js';
import { state } from './state.js';
import {
  renderer, scene, camera, root, caseGroup, capsGroup, switchGroup, knobGroup, keyGlowGroup,
  capMats, matCase, matPlate, matSwBody, matStem, matKnob,
  skirtMat, keyGlowMat, keyGlowGeo, createLegendGlowMat,
  CAP_Y, setPlateMesh, setBoardDims, sRGB, uni,
  aoPlane, glowPlane,
} from './scene.js';
import { BRAND_MARKS, MARKS, EMOJI, emojiUrl } from '../data/art.js';
import {
  getEffectiveText, getEffectiveFg, getEffectiveMark,
  getEffectiveImage, getEffectiveFontSize, hasGlow, hasImageBehindText,
  getOverride, keyId as perKeyId, getAllEntries,
} from './perKey.js';
import { composeLegend, renderText } from './imageLoader.js';

export let plateMesh = null;
let plateBaseY = 0.6;
let knobBaseY = 1.04;
export let boardW = 0;
let boardD = 0;

/* geometry helpers */
function rrect(w, d, r) {
  const s = new THREE.Shape(), hw = w / 2, hd = d / 2;
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r);
  s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r);
  s.lineTo(-hw, -hd + r);
  s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return s;
}
function rrhole(w, d, r) {
  const pts = rrect(w, d, r).getPoints(24);
  pts.reverse();
  return new THREE.Path(pts);
}
function extrudeFlat(shape, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: !!bevel,
    bevelThickness: bevel || 0,
    bevelSize: (bevel || 0) * 0.9,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.rotateX(-Math.PI / 2);
  return g;
}

/* keycap geometry */
const capGeoCache = new Map();
function capGeo(wU, profId) {
  const key = wU + '|' + profId;
  if (capGeoCache.has(key)) return capGeoCache.get(key);
  const p = PROFILES[profId];
  const w = wU - GAP, d = 1 - GAP, bev = 0.045;
  const g = new THREE.ExtrudeGeometry(rrect(w, d, 0.13), {
    depth: p.h,
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: 0.035,
    bevelSegments: 3,
    curveSegments: 5,
  });
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, v = new THREE.Vector3();
  const hw = w / 2, hd = d / 2, topY = p.h + bev;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp((v.y + bev) / (topY + bev), 0, 1);
    const s = 1 - (1 - p.taper) * t;
    v.x *= s;
    v.z *= s;
    if (v.y > p.h * 0.82) {
      const nx = v.x / (hw * p.taper), nz = v.z / (hd * p.taper);
      const rr = Math.min(1, nx * nx + nz * nz);
      v.y -= p.dish * (1 - rr);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  capGeoCache.set(key, g);
  return g;
}

/* legend textures */
const legendCache = new Map();
const L_CACHE_MAX = 200;
function legendCacheSet(k, v) {
  if (legendCache.size >= L_CACHE_MAX) {
    const first = legendCache.keys().next().value;
    if (first !== undefined) {
      const old = legendCache.get(first);
      if (old) old.dispose();
      legendCache.delete(first);
    }
  }
  legendCache.set(k, v);
}
const S = 2;
function legendTex(label, wU, fg, mark, opts) {
  opts = opts || {};
  const useLabel = (opts.customText !== undefined) ? opts.customText : label;
  const useFg = (opts.customFg !== undefined) ? opts.customFg : fg;
  const useText = useLabel || '';
  const cacheKey = (useLabel || '') + '|' + wU + '|' + (useFg || 'nofg') + (mark ? '|' + mark : '') + (opts.imageData ? '|img' : '') + (opts.glow ? '|glow' : '');
  if (!opts.glow && legendCache.has(cacheKey)) return legendCache.get(cacheKey);
  const W = Math.max(128, Math.round(128 * wU)) * S, H = 128 * S;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const pad = 17 * S;

  if (opts.imageData) {
    const img = new Image();
    img.src = opts.imageData;
    const iw = img.naturalWidth || W;
    const ih = img.naturalHeight || H;
    const scale = Math.min((W - pad * 2) / iw, (H - pad * 2) / ih);
    const dw = iw * scale, dh = ih * scale;
    g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    if (opts.imageBehindText && useText) {
      renderText(g, useText, useFg, opts.fontSize || 29, W, H, S, pad);
    }
  } else if (opts.glow) {
    renderText(g, useText, '#ffffff', opts.fontSize || 29, W, H, S, pad);
  } else if (useText) {
    const em = mark && emojiImg[mark];
    if (em && em.ready) {
      const sz = Math.min(W, H) * 0.76;
      g.drawImage(em.img, (W - sz) / 2, (H - sz) / 2, sz, sz);
    } else if (mark && MARKS[mark]) {
      MARKS[mark](g, W, H, useFg);
    } else {
      renderText(g, useText, useFg, opts.fontSize || 29, W, H, S, pad);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.colorSpace = THREE.SRGBColorSpace;
  if (!opts.glow) legendCacheSet(cacheKey, t);
  return t;
}



const emojiImg = {};
export function preloadEmoji() {
  Object.entries(EMOJI).forEach(([id, cp]) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const rec = { img, ready: false };
    img.onload = () => {
      rec.ready = true;
      legendCache.clear();
      if (state.brand) refreshLegends();
    };
    img.src = emojiUrl(cp);
    emojiImg[id] = rec;
  });
}

const markFor = (label) =>
  (BRAND_MARKS[state.brand] && BRAND_MARKS[state.brand][label]) || null;

function disposeGroup(gr) {
  while (gr.children.length) {
    const o = gr.children.pop();
    o.traverse((n) => {
      if (n.geometry && !n.userData.keepGeo && !capGeoCache.has(n.userData.gk))
        n.geometry.dispose();
    });
  }
}

export function buildCase() {
  disposeGroup(caseGroup);
  disposeGroup(knobGroup);
  const L = LAYOUTS[state.layout];
  boardW = L.total + 1.0;
  boardD = 6.0;
  const bottom = new THREE.Mesh(
    extrudeFlat(rrect(boardW, boardD, 0.55), 0.58, 0.04),
    matCase,
  );
  bottom.position.y = 0.04;
  bottom.castShadow = bottom.receiveShadow = true;
  caseGroup.add(bottom);
  const wallShape = rrect(boardW, boardD, 0.55);
  wallShape.holes.push(rrhole(boardW - 0.72, boardD - 0.72, 0.34));
  const wall = new THREE.Mesh(extrudeFlat(wallShape, 0.42), matCase);
  wall.position.y = 0.62;
  wall.castShadow = wall.receiveShadow = true;
  caseGroup.add(wall);
  const plateM = new THREE.Mesh(
    extrudeFlat(rrect(boardW - 0.8, boardD - 0.8, 0.3), 0.1),
    matPlate,
  );
  plateM.position.y = plateBaseY;
  plateM.receiveShadow = true;
  caseGroup.add(plateM);
  plateMesh = plateM;
  const skirt = new THREE.Mesh(
    extrudeFlat(rrect(boardW + 0.05, boardD + 0.05, 0.57), 0.12),
    skirtMat,
  );
  skirt.position.y = 0.015;
  caseGroup.add(skirt);
  if (L.knob) {
    const body = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 72, 1, false);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), z = bp.getZ(i), r = Math.hypot(x, z);
      if (r > 0.4) {
        const a = Math.atan2(z, x), kk = 1 + 0.02 * Math.sign(Math.sin(a * 28));
        bp.setX(i, x * kk);
        bp.setZ(i, z * kk);
      }
    }
    body.computeVertexNormals();
    const bm = new THREE.Mesh(body, matKnob);
    bm.position.y = 0.16;
    bm.castShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.07, 48), matKnob);
    top.position.y = 0.35;
    const dotm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12),
      new THREE.MeshBasicMaterial({ color: sRGB(0xdddde2) }),
    );
    dotm.position.set(0.24, 0.39, 0);
    knobGroup.add(bm, top, dotm);
    knobGroup.position.set(15.75 - L.total / 2, knobBaseY, -2);
    knobGroup.traverse((n) => (n.userData.isKnob = true));
  }
  knobGroup.visible = !!L.knob && state.extras.knob;
  aoPlane.scale.set(boardW * 1.3, boardD * 1.7, 1);
  glowPlane.scale.set(boardW * 1.9, boardD * 2.9, 1);
}

function makeSwitch(x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), matSwBody);
  body.position.y = 0.85;
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.17, 0.34), matStem);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.17, 0.13), matStem);
  s1.position.y = s2.position.y = 1.06;
  g.add(body, s1, s2);
  g.position.set(x, 0, z);
  return g;
}

function buildOneKey(keyDef, ri, ci, cx, cz, prof, cw, addToGroups) {
  const mesh = new THREE.Mesh(capGeo(keyDef.w, state.profile), capMats[keyDef.r]);
  mesh.userData.gk = keyDef.w + '|' + state.profile;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.position.set(cx, CAP_Y, cz);
  mesh.rotation.x = prof.tilt[ri];
  const id = perKeyId(ri, ci);
  const effectiveLabel = getEffectiveText(id, keyDef.l);
  const effectiveFg = getEffectiveFg(id, cw[keyDef.r].fg);
  const effectiveMark = getEffectiveMark(id, markFor(keyDef.l));
  const effectiveImage = getEffectiveImage(id);
  const effectiveFs = getEffectiveFontSize(id, 29);
  const glow = hasGlow(id);
  const imgBehind = hasImageBehindText(id);
  const customBg = (getOverride(id) && getOverride(id).bgColor) || null;

  mesh.userData = Object.assign(mesh.userData, {
    isCap: true, baseY: CAP_Y, row: ri, col: ci,
    label: keyDef.l, w: keyDef.w, role: keyDef.r,
    perKeyId: id,
  });

  if (effectiveLabel) {
    const topW = (keyDef.w - GAP) * prof.taper * 0.92, topD = (1 - GAP) * prof.taper * 0.82;
    const texOpts = {
      customText: effectiveLabel,
      customFg: effectiveFg,
      imageData: effectiveImage,
      glow,
      imageBehindText: imgBehind,
      fontSize: effectiveFs,
    };
    const leg = new THREE.Mesh(
      new THREE.PlaneGeometry(topW, topD),
      new THREE.MeshBasicMaterial({
        map: legendTex(keyDef.l, keyDef.w, cw[keyDef.r].fg, effectiveMark, texOpts),
        transparent: true,
        depthWrite: false,
      }),
    );
    leg.material.toneMapped = false;
    leg.rotation.x = -Math.PI / 2;
    leg.position.y = prof.h + 0.052;
    leg.renderOrder = 2;
    mesh.add(leg);
    mesh.userData.legend = leg;

    if (glow) {
      const glowMat = createLegendGlowMat();
      const maskTex = legendTex(keyDef.l, keyDef.w, '#ffffff', effectiveMark, texOpts);
      glowMat.uniforms.uMask.value = maskTex;
      const glowLeg = new THREE.Mesh(new THREE.PlaneGeometry(topW, topD), glowMat);
      glowLeg.rotation.x = -Math.PI / 2;
      glowLeg.position.y = prof.h + 0.056;
      glowLeg.renderOrder = 3;
      mesh.add(glowLeg);
      mesh.userData.glowLegend = glowLeg;
    }
  }

  if (addToGroups !== false) {
    capsGroup.add(mesh);
    switchGroup.add(makeSwitch(cx, cz));
    const glow = new THREE.Mesh(keyGlowGeo, keyGlowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(cx, 1.02, cz);
    glow.scale.set(keyDef.w * 1.16, 1.16, 1);
    glow.renderOrder = 1;
    glow.userData.keepGeo = true;
    keyGlowGroup.add(glow);
  }
  return mesh;
}

export function buildKeys() {
  disposeGroup(capsGroup);
  disposeGroup(switchGroup);
  disposeGroup(keyGlowGroup);
  const L = LAYOUTS[state.layout], rows = L.rows(), center = L.total / 2;
  const prof = PROFILES[state.profile];
  const cw = COLORWAYS[state.colorway];
  rows.forEach((row, ri) => {
    let cur = 0;
    row.forEach((keyDef, ci) => {
      const start = keyDef.x !== undefined ? keyDef.x : cur;
      const cx = start + keyDef.w / 2 - center, cz = ri - 2;
      cur = start + keyDef.w;
      buildOneKey(keyDef, ri, ci, cx, cz, prof, cw);
    });
  });
}

export function rebuildKey(ri, ci) {
  const L = LAYOUTS[state.layout], rows = L.rows(), center = L.total / 2;
  const prof = PROFILES[state.profile];
  const cw = COLORWAYS[state.colorway];
  if (ri >= rows.length) return;
  const row = rows[ri];
  if (ci >= row.length) return;
  const keyDef = row[ci];
  let cur = 0;
  for (let i = 0; i < ci; i++) {
    const k = row[i];
    cur = (k.x !== undefined ? k.x : cur) + (k.w || 1);
  }
  const start = keyDef.x !== undefined ? keyDef.x : cur;
  const cx = start + keyDef.w / 2 - center, cz = ri - 2;

  /* remove existing */
  const id = perKeyId(ri, ci);
  for (let i = capsGroup.children.length - 1; i >= 0; i--) {
    const c = capsGroup.children[i];
    if (c.userData.perKeyId === id) {
      capsGroup.remove(c);
      c.traverse((n) => {
        if (n.geometry && n.userData.gk !== keyDef.w + '|' + state.profile) n.geometry.dispose();
      });
      break;
    }
  }

  const mesh = buildOneKey(keyDef, ri, ci, cx, cz, prof, cw, false);
  capsGroup.add(mesh);

  /* rebuild glow plane */
  for (let i = keyGlowGroup.children.length - 1; i >= 0; i--) {
    const g = keyGlowGroup.children[i];
    if (Math.abs(g.position.x - cx) < 0.01 && Math.abs(g.position.z - cz) < 0.01) {
      keyGlowGroup.remove(g);
      break;
    }
  }
  const glow = new THREE.Mesh(keyGlowGeo, keyGlowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(cx, 1.02, cz);
  glow.scale.set(keyDef.w * 1.16, 1.16, 1);
  glow.renderOrder = 1;
  glow.userData.keepGeo = true;
  keyGlowGroup.add(glow);
}

export function rebuildBoard() {
  buildCase();
  buildKeys();
}

export function refreshLegends() {
  const cw = COLORWAYS[state.colorway];
  capsGroup.children.forEach((c) => {
    if (!c.userData.legend) return;
    const id = c.userData.perKeyId;
    const effectiveLabel = getEffectiveText(id, c.userData.label);
    const effectiveFg = getEffectiveFg(id, cw[c.userData.role].fg);
    const effectiveMark = getEffectiveMark(id, markFor(c.userData.label));
    const effectiveImage = getEffectiveImage(id);
    const effectiveFs = getEffectiveFontSize(id, 29);
    const glow = hasGlow(id);
    const imgBehind = hasImageBehindText(id);
    const texOpts = {
      customText: effectiveLabel,
      customFg: effectiveFg,
      imageData: effectiveImage,
      glow,
      imageBehindText: imgBehind,
      fontSize: effectiveFs,
    };
    c.userData.legend.material.map = legendTex(
      c.userData.label, c.userData.w, cw[c.userData.role].fg, effectiveMark, texOpts,
    );
    c.userData.legend.material.needsUpdate = true;
    if (glow && !c.userData.glowLegend) {
      const topW = (c.userData.w - GAP) * PROFILES[state.profile].taper * 0.92;
      const topD = (1 - GAP) * PROFILES[state.profile].taper * 0.82;
      const glowMat = createLegendGlowMat();
      const maskTex = legendTex(c.userData.label, c.userData.w, '#ffffff', effectiveMark, texOpts);
      glowMat.uniforms.uMask.value = maskTex;
      const glowLeg = new THREE.Mesh(new THREE.PlaneGeometry(topW, topD), glowMat);
      glowLeg.rotation.x = -Math.PI / 2;
      glowLeg.position.y = PROFILES[state.profile].h + 0.056;
      glowLeg.renderOrder = 3;
      c.add(glowLeg);
      c.userData.glowLegend = glowLeg;
    } else if (!glow && c.userData.glowLegend) {
      c.remove(c.userData.glowLegend);
      c.userData.glowLegend = null;
    } else if (glow && c.userData.glowLegend) {
      c.userData.glowLegend.material.uniforms.uMask.value = legendTex(
        c.userData.label, c.userData.w, '#ffffff', effectiveMark, texOpts,
      );
    }
  });
}
