const state = {
  layout: '75',
  profile: 'cherry',
  material: 'pbt',
  brand: 'claude',
  colorway: 'claude',
  sw: 'boba',
  caseColor: 'porcelain',
  /** Custom case tint (hex). null → use CASES[caseColor].c */
  caseCustomColor: null,
  finish: 'anodized',
  plate: 'brass',
  /** Custom plate tint (hex). null → use PLATES[plate].c default for that material. */
  plateColor: null,
  /** Custom switch stem tint (hex). null → use SWITCHES[sw].dot */
  switchColor: null,
  light: { mode: 'static', color: '#cc785c', bright: 0.7 },
  extras: { knob: true, cable: false, wrist: false, lube: false },
  tool: 'orbit',
  view: '3d',
  exploded: false,
  theme: 'light',
  section: 'keycaps',
  selectedPreset: 'claude',
  selectedKey: null,
  /** Multi-select key ids for Customize panel */
  selectedKeys: [],
  /** Mobile multi-select toggle */
  multiSelectMode: false,
  customColors: null,
  perKeyOverrides: {},
  /**
   * Customize photo-match: which board parts adopt colours from the photo.
   * keys = per-key median copy; case/plate/light/switch = role tints.
   */
  photoMatchApply: {
    keys: true,
    case: true,
    plate: true,
    light: true,
    switch: true,
  },
};

export { state };

export function stateSlice() {
  return JSON.parse(JSON.stringify({
    layout: state.layout,
    profile: state.profile,
    brand: state.brand,
    colorway: state.colorway,
    caseColor: state.caseColor,
    caseCustomColor: state.caseCustomColor,
    finish: state.finish,
    plate: state.plate,
    plateColor: state.plateColor,
    sw: state.sw,
    switchColor: state.switchColor,
    material: state.material,
    light: state.light,
    extras: state.extras,
    customColors: state.customColors,
    perKeyOverrides: state.perKeyOverrides,
    view: state.view,
    tool: state.tool,
    exploded: state.exploded,
    theme: state.theme,
  }));
}
