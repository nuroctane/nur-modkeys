export const CASES = {
  porcelain: { name: "Porcelain", c: "#e7dfce" },
  clay: { name: "Claude Clay", c: "#cf7358" },
  spacegray: { name: "Space Gray", c: "#55565a" },
  midnight: { name: "Midnight", c: "#1c1c1f" },
  silver: { name: "Silver", c: "#c6c7ca" },
  navy: { name: "Navy", c: "#2a3550" },
  olive: { name: "Olive", c: "#4c523f" },
  ewhite: { name: "E-White", c: "#e8e7e2" },
  rosegold: { name: "Rose Gold", c: "#b76e79" },
  burgundy: { name: "Burgundy", c: "#6a1e2a" },
  forest: { name: "Forest", c: "#2d4a32" },
  lavender: { name: "Lavender", c: "#7b6d9e" },
  copper: { name: "Copper", c: "#b8734a" },
  coral: { name: "Coral", c: "#d47d7c" },
  arctic: { name: "Arctic", c: "#e6eaef" },
  sakura: { name: "Sakura", c: "#f2d7d5" },
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
  copper: { name: "Copper", c: "#b8734a", tag: "Warm, resonant", metal: 0.85, rough: 0.5, env: 0.4 },
  steel: { name: "Steel", c: "#d4d4d8", tag: "Bright, crisp", metal: 0.9, rough: 0.4, env: 0.7 },
  pom: { name: "POM", c: "#e6e6e6", tag: "Soft, quiet", metal: 0.0, rough: 0.36, env: 0.1 },
  fr4: { name: "FR4", c: "#6b6b6b", tag: "Stiff, resonant", metal: 0.5, rough: 0.55, env: 0.55 },
};

export const SWITCHES = {
  boba: { name: "Boba U4T", type: "Tactile", force: "62g", dot: "#e8dcc8", sound: "thock" },
  panda: { name: "Holy Panda", type: "Tactile", force: "67g", dot: "#d8b48a", sound: "tactile" },
  jade: { name: "Box Jade", type: "Clicky", force: "50g", dot: "#7fb89a", sound: "clicky" },
  ink: { name: "Silent Ink", type: "Linear", force: "60g", dot: "#565672", sound: "silent" },
  cream: { name: "Cream", type: "Linear", force: "55g", dot: "#e8d8c9", sound: "thock" },
  teal: { name: "Teal", type: "Linear", force: "67g", dot: "#66d9cc", sound: "linear" },
  sunset: { name: "Sunset", type: "Tactile", force: "55g", dot: "#f28c8c", sound: "tactile" },
  topaz: { name: "Topaz", type: "Tactile", force: "58g", dot: "#9b5de5", sound: "tactile" },
  emerald: { name: "Emerald", type: "Clicky", force: "65g", dot: "#20bf6b", sound: "clicky" },
  silver: { name: "Silver", type: "Linear", force: "45g", dot: "#a0aec0", sound: "linear" },
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
  dsa: { name: "DSA", h: 0.28, taper: 0.88, dish: 0.012, tilt: [0, 0, 0, 0, 0] },
  mt3: { name: "MT3", h: 0.55, taper: 0.68, dish: 0.055, tilt: [-0.12, -0.06, 0, 0.06, 0.11] },
  asa: { name: "ASA", h: 0.43, taper: 0.76, dish: 0.035, tilt: [-0.08, -0.03, 0, 0.04, 0.07] },
};

export const LIGHT_COLORS = ["#cc785c","#4184f3","#e86aa0","#8a7bff","#ff5ea8","#4ea1ff","#5fd68b","#ffb35e","#ffffff"];

export const GAP = 0.14;
