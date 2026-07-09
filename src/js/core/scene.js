import * as THREE from 'three';
import { CASES, PLATES, SWITCHES, MATERIALS, PROFILES, GAP, LIGHT_COLORS } from '../data/components.js';
import { COLORWAYS, PANEL_SWATCHES } from '../data/colorways.js';
import { state } from './state.js';

const getStage = () => document.getElementById('stage');
const getCanvas = () => document.getElementById('gl');


const renderer = new THREE.WebGLRenderer({
  canvas: getCanvas(),
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(31, 1.6, 0.1, 200);

/* environment via PMREM */
const pmrem = new THREE.PMREMGenerator(renderer);
(function buildEnv() {
  const es = new THREE.Scene();
  const skyTex = (() => {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 256;
    const g = c.getContext('2d');
    for (let row = 0; row < 256; row++) {
      const h = 1 - row / 255;
      const t = Math.pow(h, 1.6);
      const r = ((0.22 + (0.95 - 0.22) * t) * 255) | 0;
      const gg = ((0.23 + (0.95 - 0.23) * t) * 255) | 0;
      const b = ((0.25 + (0.95 - 0.25) * t) * 255) | 0;
      g.fillStyle = `rgb(${r},${gg},${b})`;
      g.fillRect(0, row, 8, 1);
    }
    return new THREE.CanvasTexture(c);
  })();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(30, 24, 14),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }),
  );
  es.add(sky);
  const panel = (w, h, x, y, z, rx, ry, i) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    es.add(m);
  };
  panel(18, 9, 0, 13, 0, Math.PI / 2, 0, 5.0);
  panel(22, 2.6, 0, 3, 13, 0, Math.PI, 2.6);
  panel(6, 11, -13, 6, 1, 0, Math.PI / 2, 3.2);
  panel(5, 9, 13, 5, -2, 0, -Math.PI / 2, 1.6);
  scene.environment = pmrem.fromScene(es, 0.07).texture;
})();

/* lights */
const hemi = new THREE.HemisphereLight(0xffffff, 0xb8bcc4, 0.62);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 0.4);
key.position.set(6, 10, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 5;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.camera.left = -6;
key.shadow.camera.right = 6;
key.shadow.camera.top = 6;
key.shadow.camera.bottom = -6;
key.shadow.camera.far = 30;
scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe6ff, 0.12);
rim.position.set(-7, 6, -6);
scene.add(rim);

/* root group */
const KB_SCALE = 0.45;
const root = new THREE.Group();
root.scale.setScalar(KB_SCALE);
root.position.y = -0.46;
scene.add(root);

/* shared materials */
const noiseTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), im = g.createImageData(128, 128);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = (118 + Math.random() * 20) | 0;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
    im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
})();

const sRGB = (hex) => new THREE.Color(hex).convertSRGBToLinear();

function capMat(hex) {
  return new THREE.MeshPhysicalMaterial({
    color: sRGB(hex),
    roughness: 0.82,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 0.4,
    bumpMap: noiseTex,
    bumpScale: 0.0024,
    reflectivity: 0.2,
    envMapIntensity: 0.05,
  });
}

const cw0 = COLORWAYS[state.colorway];
const matAlpha = capMat(cw0.a.bg);
const matMod = capMat(cw0.m.bg);
const matAccent = capMat(cw0.x.bg);
export const capMats = { a: matAlpha, m: matMod, x: matAccent };

const matCase = new THREE.MeshPhysicalMaterial({
  color: sRGB(CASES[state.caseColor].c),
  metalness: 0.85,
  roughness: 0.42,
  clearcoat: 0.4,
  clearcoatRoughness: 0.35,
  envMapIntensity: 1.1,
});

/* Procedural plate material textures — metalness/roughness still come from
   PLATES[id]; these maps give optical identity (weave, brush, PCB grain).
   Color multiplies the map so a custom plateColor tints the texture. */
function makeCanvasTex(draw, size = 256, repeat = 4) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function plateTextureFor(id) {
  if (id === 'carbon') {
    return makeCanvasTex((g, s) => {
      g.fillStyle = '#1a1b1f';
      g.fillRect(0, 0, s, s);
      const step = 8;
      for (let y = 0; y < s; y += step) {
        for (let x = 0; x < s; x += step) {
          const on = ((x / step) + (y / step)) % 2 === 0;
          g.fillStyle = on ? '#2c2e34' : '#121316';
          g.fillRect(x, y, step, step);
          g.strokeStyle = 'rgba(255,255,255,0.06)';
          g.strokeRect(x + 0.5, y + 0.5, step - 1, step - 1);
        }
      }
      /* diagonal tow highlight */
      g.strokeStyle = 'rgba(180,190,210,0.08)';
      g.lineWidth = 1;
      for (let i = -s; i < s * 2; i += 6) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + s, s);
        g.stroke();
      }
    }, 256, 6);
  }
  if (id === 'fr4') {
    return makeCanvasTex((g, s) => {
      g.fillStyle = '#3d4a38';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * s, y = Math.random() * s;
        const v = (80 + Math.random() * 60) | 0;
        g.fillStyle = `rgba(${v},${v + 20},${v - 10},0.35)`;
        g.fillRect(x, y, 1 + Math.random() * 2, 1);
      }
      g.strokeStyle = 'rgba(0,0,0,0.15)';
      g.lineWidth = 1;
      for (let i = 0; i < s; i += 16) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke();
      }
    }, 256, 3);
  }
  if (id === 'poly' || id === 'pom') {
    return makeCanvasTex((g, s) => {
      const grd = g.createLinearGradient(0, 0, s, s);
      grd.addColorStop(0, '#f4f6f8');
      grd.addColorStop(1, '#d8dde3');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 2000; i++) {
        const v = (200 + Math.random() * 40) | 0;
        g.fillStyle = `rgba(${v},${v},${v},0.4)`;
        g.fillRect(Math.random() * s, Math.random() * s, 1, 1);
      }
    }, 128, 2);
  }
  /* brushed metals: aluminum, brass, copper, steel */
  return makeCanvasTex((g, s) => {
    g.fillStyle = '#c8c8c8';
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      const v = (140 + Math.random() * 70) | 0;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(0, y, s, 1);
      if (Math.random() > 0.92) {
        g.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.12})`;
        g.fillRect(0, y, s, 1);
      }
    }
  }, 256, id === 'steel' ? 8 : 5);
}

const plateTexCache = {};
function getPlateTexture(id) {
  if (!plateTexCache[id]) plateTexCache[id] = plateTextureFor(id);
  return plateTexCache[id];
}

/* Distinct keycap surface maps: PBT gritty, ABS smoother swirl, ceramic fine glaze */
const capSurfaceTex = {
  pbt: noiseTex,
  abs: (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d'), im = g.createImageData(128, 128);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = (150 + Math.random() * 12) | 0;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  })(),
  ceramic: (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#e8e8e8';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 800; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
      g.beginPath();
      g.arc(Math.random() * 128, Math.random() * 128, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    return t;
  })(),
};

const matPlate = new THREE.MeshStandardMaterial({
  color: sRGB(PLATES[state.plate].c),
  metalness: PLATES[state.plate].metal,
  roughness: PLATES[state.plate].rough,
  envMapIntensity: PLATES[state.plate].env,
  map: getPlateTexture(state.plate),
  bumpMap: getPlateTexture(state.plate),
  bumpScale: 0.012,
});

/** Apply plate material type (texture/metal) + optional custom color tint. */
export function applyPlateFinish(id, colorHex) {
  const pl = PLATES[id] || PLATES.brass;
  const hex = colorHex || pl.c;
  matPlate.color.copy(sRGB(hex));
  matPlate.metalness = pl.metal;
  matPlate.roughness = pl.rough;
  matPlate.envMapIntensity = pl.env;
  const tex = getPlateTexture(id);
  matPlate.map = tex;
  matPlate.bumpMap = tex;
  matPlate.bumpScale = id === 'carbon' ? 0.02 : id === 'fr4' ? 0.015 : 0.01;
  matPlate.needsUpdate = true;
}

/** Switch keycap surface map when PBT/ABS/Ceramic changes. */
export function applyCapMaterial(id) {
  const m = MATERIALS[id] || MATERIALS.pbt;
  const map = capSurfaceTex[id] || noiseTex;
  [matAlpha, matMod, matAccent].forEach((mm) => {
    mm.roughness = m.rough;
    mm.clearcoat = m.cc;
    mm.clearcoatRoughness = m.ccr;
    mm.bumpMap = map;
    mm.bumpScale = m.bump;
    mm.envMapIntensity = m.env;
    mm.needsUpdate = true;
  });
}

const matSwBody = new THREE.MeshStandardMaterial({
  color: sRGB(0x17171a),
  roughness: 0.45,
  metalness: 0.1,
});

const matStem = new THREE.MeshStandardMaterial({
  color: sRGB(SWITCHES[state.sw].dot),
  roughness: 0.5,
});

const matKnob = new THREE.MeshPhysicalMaterial({
  color: sRGB(0x2a2a2d),
  metalness: 0.95,
  roughness: 0.28,
  clearcoat: 0.6,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.4,
});

/* underglow shader uniforms */
export const uni = {
  uTime: { value: 0 },
  uBright: { value: state.light.bright },
  uMode: { value: 0 },
  uColor: { value: new THREE.Color(state.light.color) },
};

const HSL = 'vec3 h2r(float h){vec3 p=abs(fract(vec3(h)+vec3(0.,.6667,.3333))*6.-3.);return clamp(p-1.,0.,1.);}';

const skirtMat = new THREE.ShaderMaterial({
  uniforms: uni,
  side: THREE.DoubleSide,
  vertexShader: 'varying vec3 vW;void main(){vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: HSL + `
uniform float uTime,uBright;uniform int uMode;uniform vec3 uColor;varying vec3 vW;
void main(){
  float pulse = uMode==2 ? (0.3+0.7*(0.5+0.5*sin(uTime*2.2))) : 1.0;
  vec3 col = uMode==0 ? h2r(fract(vW.x*0.19+uTime*0.1)) : uColor;
  gl_FragColor = vec4(col*uBright*pulse*1.7, 1.0);
}`,
});
skirtMat.toneMapped = false;

const glowMat = new THREE.ShaderMaterial({
  uniforms: uni,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: HSL + `
uniform float uTime,uBright;uniform int uMode;uniform vec3 uColor;varying vec2 vUv;
void main(){
  float pulse = uMode==2 ? (0.3+0.7*(0.5+0.5*sin(uTime*2.2))) : 1.0;
  float d = length((vUv-.5)*vec2(1.0,1.7))*2.0;
  float a = smoothstep(1.0,0.12,d)*0.5*uBright*pulse;
  vec3 col = uMode==0 ? h2r(fract((vUv.x-.5)*1.3+uTime*0.1)) : uColor;
  gl_FragColor = vec4(col*a, a);
}`,
});
glowMat.toneMapped = false;

export const keyGlowMat = new THREE.ShaderMaterial({
  uniforms: uni,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: HSL + `
uniform float uTime,uBright;uniform int uMode;uniform vec3 uColor;varying vec2 vUv;varying vec3 vW;
void main(){
  float pulse = uMode==2 ? (0.3+0.7*(0.5+0.5*sin(uTime*2.2))) : 1.0;
  vec2 p = abs(vUv-0.5)*2.0;
  float d = max(p.x,p.y);
  float a = smoothstep(1.0,0.28,d)*uBright*pulse*2.4;
  vec3 col = uMode==0 ? h2r(fract(vW.x*0.14+uTime*0.1)) : uColor;
  gl_FragColor = vec4(col*a, a);
}`,
});
keyGlowMat.toneMapped = false;

/* per-key legend glow shader — renders glow color masked by legend text shape */
export function createLegendGlowMat() {
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, uni, { uMask: { value: null } }),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: HSL + `
uniform float uTime,uBright;uniform int uMode;uniform vec3 uColor;uniform sampler2D uMask;varying vec2 vUv;varying vec3 vW;
void main(){
  float pulse = uMode==2 ? (0.3+0.7*(0.5+0.5*sin(uTime*2.2))) : 1.0;
  vec4 m = texture2D(uMask, vUv);
  float mask = m.r;
  float a = mask * uBright * pulse * 2.0;
  vec3 col = uMode==0 ? h2r(fract(vW.x*0.14+uTime*0.1)) : uColor;
  gl_FragColor = vec4(col*a, a);
}`,
  });
  mat.toneMapped = false;
  return mat;
}

/* scene groups */
export const caseGroup = new THREE.Group();
export const capsGroup = new THREE.Group();
export const switchGroup = new THREE.Group();
export const knobGroup = new THREE.Group();
export const cableGroup = new THREE.Group();
export const wristGroup = new THREE.Group();
export const keyGlowGroup = new THREE.Group();
root.add(caseGroup, capsGroup, switchGroup, knobGroup, cableGroup, wristGroup, keyGlowGroup);

export const keyGlowGeo = new THREE.PlaneGeometry(1, 1);
export const CAP_Y = 1.1;
export let plateMesh = null;
export let plateBaseY = 0.6;
export let knobBaseY = 1.04;
export let boardW = 0;
export let boardD = 0;

export function setPlateMesh(m) { plateMesh = m; }
export function setBoardDims(w, d) { boardW = w; boardD = d; }

/* ground */
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(46, 46),
  new THREE.ShadowMaterial({ opacity: 0.16 }),
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = 0.002;
shadowPlane.receiveShadow = true;
root.add(shadowPlane);

const aoTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, 'rgba(10,10,14,.42)');
  gr.addColorStop(0.55, 'rgba(10,10,14,.20)');
  gr.addColorStop(1, 'rgba(10,10,14,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();
const aoPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }),
);
aoPlane.rotation.x = -Math.PI / 2;
aoPlane.position.y = 0.004;
root.add(aoPlane);

const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat);
glowPlane.rotation.x = -Math.PI / 2;
glowPlane.position.y = 0.006;
root.add(glowPlane);

/* helpers used by controls */
export { matAlpha, matMod, matAccent, matCase, matPlate, matSwBody, matStem, matKnob, skirtMat, glowMat, noiseTex, sRGB, capMat, aoPlane, glowPlane, shadowPlane };
export { renderer, scene, camera, root, pmrem, hemi, key, rim, KB_SCALE };
