import * as THREE from 'three';
import { renderer, scene, camera, root, caseGroup, capsGroup, knobGroup, uni } from './scene.js';
import { plateMesh } from './keyboard.js';
import { state } from './state.js';
import { SWITCHES } from '../data/components.js';
import { playSwitch } from '../ui/sound.js';

const canvas = document.getElementById('gl');
const stage = document.getElementById('stage');

/* camera rig with inertia */
export const ctrl = {
  theta: -0.58,
  phi: 1.02,
  radius: 10.6,
  target: new THREE.Vector3(0, -0.08, 0),
  vT: 0,
  vP: 0,
  apply() {
    this.phi = THREE.MathUtils.clamp(this.phi, 0.06, 1.44);
    this.radius = THREE.MathUtils.clamp(this.radius, 5.5, 17);
    const sp = Math.sin(this.phi);
    camera.position.set(
      this.target.x + this.radius * sp * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sp * Math.cos(this.theta),
    );
    camera.lookAt(this.target);
  },
};

const VIEWS = {
  '3d': { theta: -0.58, phi: 1.02, radius: 10.6, ty: -0.08 },
  explode: { theta: -0.34, phi: 0.82, radius: 12.6, ty: 0.42 },
  top: { theta: -0.02, phi: 0.07, radius: 10.8, ty: 0 },
  side: { theta: Math.PI / 2, phi: 1.34, radius: 9.6, ty: 0.05 },
  front: { theta: 0, phi: 1.3, radius: 9.9, ty: 0.1 },
};

export function flyTo(v, dur) {
  ctrl.vT = ctrl.vP = 0;
  const twoPi = Math.PI * 2;
  let dT = (v.theta - ctrl.theta) % twoPi;
  if (dT > Math.PI) dT -= twoPi;
  if (dT < -Math.PI) dT += twoPi;
  const gsap = window.gsap;
  gsap.to(ctrl, {
    theta: ctrl.theta + dT,
    phi: v.phi,
    radius: v.radius,
    duration: dur || 1.15,
    ease: 'power3.inOut',
    overwrite: 'auto',
  });
  gsap.to(ctrl.target, {
    y: v.ty,
    duration: dur || 1.15,
    ease: 'power3.inOut',
    overwrite: 'auto',
  });
}

function setExplode(on) {
  const gsap = window.gsap;
  state.exploded = on;
  capsGroup.children.forEach((c) => {
    gsap.to(c.position, {
      y: c.userData.baseY + (on ? 1.0 + c.userData.row * 0.16 : 0),
      duration: 0.95,
      delay: (c.userData.col * 0.012 + c.userData.row * 0.055) * (on ? 1 : 0.5),
      ease: 'power3.inOut',
      overwrite: 'auto',
    });
  });
  if (plateMesh)
    gsap.to(plateMesh.position, {
      y: 0.6 + (on ? 0.4 : 0),
      duration: 0.9,
      ease: 'power3.inOut',
      delay: on ? 0.15 : 0,
    });
  gsap.to(knobGroup.position, {
    y: 1.04 + (on ? 0.85 : 0),
    duration: 0.9,
    ease: 'power3.inOut',
    delay: on ? 0.2 : 0,
  });
}

export function setView(v) {
  state.view = v;
  const btns = [...document.getElementById('pills').querySelectorAll('button')];
  btns.forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  const act = btns.find((b) => b.dataset.view === v),
    ind = document.getElementById('pillInd');
  ind.style.width = act.offsetWidth + 'px';
  ind.style.transform = 'translateX(' + (act.offsetLeft - 4) + 'px)';
  const wantExplode = v === 'explode';
  if (wantExplode !== state.exploded) setExplode(wantExplode);
  flyTo(VIEWS[v]);
}

/* pointer interaction */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let pointers = new Map(), dragMode = null,
  lastX = 0, lastY = 0, downX = 0, downY = 0,
  pinchD = 0, hoverCap = null;

function pick(list, ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(list, true);
  return hits.length ? hits[0].object : null;
}

function capOf(o) {
  while (o && !o.userData.isCap) o = o.parent;
  return o;
}

canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  lastX = downX = ev.clientX;
  lastY = downY = ev.clientY;
  if (pointers.size === 2) {
    const p = [...pointers.values()];
    pinchD = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    dragMode = 'pinch';
    return;
  }
  const hitKnob = pick(knobGroup.visible ? knobGroup.children : [], ev);
  if (hitKnob) { dragMode = 'knob'; return; }
  dragMode = state.tool === 'pan' || ev.button === 1 || ev.button === 2 || ev.shiftKey ? 'pan' : 'orbit';
  stage.classList.add('grabbing');
});

canvas.addEventListener('pointermove', (ev) => {
  if (pointers.has(ev.pointerId))
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const dx = ev.clientX - lastX, dy = ev.clientY - lastY;
  lastX = ev.clientX; lastY = ev.clientY;
  if (dragMode === 'pinch' && pointers.size === 2) {
    const p = [...pointers.values()];
    const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    ctrl.radius *= pinchD / (d || 1);
    pinchD = d;
    return;
  }
  if (dragMode === 'knob') {
    knobGroup.rotation.y -= dx * 0.02;
    const b = THREE.MathUtils.clamp(uni.uBright.value + dx * 0.004, 0.1, 1.5);
    uni.uBright.value = b;
    state.light.bright = b;
    const sl = document.querySelector('#brightSlider');
    if (sl) sl.value = b;
    return;
  }
  if (dragMode === 'orbit') {
    ctrl.theta -= dx * 0.0052;
    ctrl.phi -= dy * 0.0052;
    ctrl.vT = -dx * 0.0052;
    ctrl.vP = -dy * 0.0052;
    return;
  }
  if (dragMode === 'pan') {
    const f = ctrl.radius * 0.0012;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
    ctrl.target.addScaledVector(right, -dx * f).addScaledVector(up, dy * f);
    return;
  }
  const overKnob = knobGroup.visible && pick(knobGroup.children, ev);
  const hit = overKnob ? null : capOf(pick(capsGroup.children, ev));
  canvas.style.cursor = overKnob ? 'ew-resize' : hit ? 'pointer' : '';
  if (hit !== hoverCap) {
    const gsap = window.gsap;
    if (hoverCap && !state.exploded)
      gsap.to(hoverCap.position, { y: hoverCap.userData.baseY, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    hoverCap = hit;
    if (hoverCap && !state.exploded)
      gsap.to(hoverCap.position, { y: hoverCap.userData.baseY + 0.055, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  }
});

function endPointer(ev) {
  pointers.delete(ev.pointerId);
  stage.classList.remove('grabbing');
  const moved = Math.hypot(ev.clientX - downX, ev.clientY - downY);
  if (dragMode === 'orbit' && moved < 5) {
    const hit = capOf(pick(capsGroup.children, ev));
    if (hit && !state.exploded) {
      playSwitch(SWITCHES[state.sw].sound);
      const gsap = window.gsap;
      gsap.timeline()
        .to(hit.position, { y: hit.userData.baseY - 0.07, duration: 0.07, ease: 'power2.in' })
        .to(hit.position, { y: hit.userData.baseY + 0.055, duration: 0.22, ease: 'back.out(3)' });
    }
  }
  dragMode = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  ctrl.radius *= 1 + ev.deltaY * 0.0011;
}, { passive: false });
