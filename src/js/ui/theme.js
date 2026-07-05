import { state } from '../core/state.js';
import { hemi, key, renderer, shadowPlane } from '../core/scene.js';

export function initTheme() {
  const btn = document.getElementById('themeBtn');
  btn.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = state.theme;
    const dark = state.theme === 'dark';
    document.getElementById('sunIc').style.display = dark ? 'none' : 'block';
    document.getElementById('moonIc').style.display = dark ? 'block' : 'none';
    hemi.intensity = dark ? 0.5 : 0.62;
    key.intensity = dark ? 0.32 : 0.4;
    shadowPlane.material.opacity = dark ? 0.3 : 0.16;
    renderer.toneMappingExposure = dark ? 0.92 : 1.0;
  });
}
