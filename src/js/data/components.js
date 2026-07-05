export const CASES = {
  porcelain: { name: "Porcelain", c: "#e7dfce" },
  clay: { name: "Claude Clay", c: "#cf7358" },
  spacegray: { name: "Space Gray", c: "#55565a" },
  midnight: { name: "Midnight", c: "#1c1c1f" },
  silver: { name: "Silver", c: "#c6c7ca" },
  navy: { name: "Navy", c: "#2a3550" },
  olive: { name: "Olive", c: "#4c523f" },
  ewhite: { name: "E-White", c: "#e8e7e2" },
};

export const FINISHES = {
  anodized: { name: "Anodized", metal: 0.85, rough: 0.42, cc: 0.4 },
  softtouch: { name: "Soft-touch", metal: 0.15, rough: 0.62, cc: 0.1 },
  polished: { name: "Polished", metal: 1.0, rough: 0.16, cc: 0.7 },
};

export const PLATES = {
  aluminum: { name: "Aluminum", c: "#cfd2d6", tag: "Balanced, crisp", metal: 0.9, rough: 0.44, env: 0.8 },
  brass: { name: "Brass", c: "#a5813a", tag: "Deep, resonant", metal: 0.85, rough: 0.52, env: 0.5 },
  poly: { name: "Polycarbonate", c: "#e6ebf0", tag: "Soft, flexible", metal: 0.0, rough: 0.34, env: 0.35 },
  carbon: { name: "Carbon Fiber", c: "#23252a", tag: "Stiff, poppy", metal: 0.55, rough: 0.55, env: 0.6 },
};

export const SWITCHES = {
  boba: { name: "Boba U4T", type: "Tactile", force: "62g", dot: "#e8dcc8", sound: "thock" },
  panda: { name: "Holy Panda", type: "Tactile", force: "67g", dot: "#d8b48a", sound: "tactile" },
  jade: { name: "Box Jade", type: "Clicky", force: "50g", dot: "#7fb89a", sound: "clicky" },
  ink: { name: "Silent Ink", type: "Linear", force: "60g", dot: "#565672", sound: "silent" },
};

export const MATERIALS = {
  pbt: { name: "PBT", rough: 0.82, cc: 0, ccr: 0.4, bump: 0.0024, env: 0.05 },
  abs: { name: "ABS", rough: 0.38, cc: 0.35, ccr: 0.3, bump: 0.0008, env: 0.12 },
  ceramic: { name: "Ceramic", rough: 0.15, cc: 0.8, ccr: 0.12, bump: 0, env: 0.3 },
};

export const EXTRAS = {
  knob: { name: "Rotary Knob", tag: "Machined aluminum, push to mute" },
  cable: { name: "Coiled Cable", tag: "Custom USB-C aviator, color matched" },
  wrist: { name: "Wrist Rest", tag: "Solid walnut, oil finished" },
  lube: { name: "Switch Lube Service", tag: "Hand lubed with Krytox 205g0" },
};

export const PROFILES = {
  cherry: { name: "Cherry", h: 0.36, taper: 0.76, dish: 0.035, tilt: [-0.085, -0.045, 0, 0.05, 0.075] },
  oem: { name: "OEM", h: 0.44, taper: 0.78, dish: 0.03, tilt: [-0.07, -0.035, 0, 0.04, 0.06] },
  xda: { name: "XDA", h: 0.31, taper: 0.9, dish: 0.015, tilt: [0, 0, 0, 0, 0] },
  sa: { name: "SA", h: 0.52, taper: 0.7, dish: 0.05, tilt: [-0.1, -0.05, 0, 0.05, 0.095] },
};

export const LIGHT_COLORS = ["#cc785c","#4184f3","#e86aa0","#8a7bff","#ff5ea8","#4ea1ff","#5fd68b","#ffb35e","#ffffff"];

export const GAP = 0.14;
