const state = {
  layout: '75',
  profile: 'cherry',
  material: 'pbt',
  brand: 'claude',
  colorway: 'claude',
  sw: 'boba',
  caseColor: 'porcelain',
  finish: 'anodized',
  plate: 'brass',
  light: { mode: 'static', color: '#cc785c', bright: 0.7 },
  extras: { knob: true, cable: false, wrist: false, lube: false },
  tool: 'orbit',
  view: '3d',
  exploded: false,
  theme: 'light',
  section: 'keycaps',
  selectedPreset: 'claude',
  selectedKey: null,
  customColors: null,
  perKeyOverrides: {},
};

export { state };

export function stateSlice() {
  return JSON.parse(JSON.stringify({
    layout: state.layout,
    profile: state.profile,
    brand: state.brand,
    colorway: state.colorway,
    caseColor: state.caseColor,
    finish: state.finish,
    plate: state.plate,
    sw: state.sw,
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
