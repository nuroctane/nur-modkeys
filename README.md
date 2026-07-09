<p align="center">
  <img src="assets/modkeys-logo.png" alt="MODKEYS" width="180" />
</p>

# MODKEYS — Keyboard Configurator

A browser-based mechanical keyboard configurator and 3D visualization tool. Build, customize, and share your dream keyboard — entirely in the browser, on desktop and mobile.

**[Try it live](https://modkeys.vercel.app/)** · also embedded at [nuroctane.xyz/modkeys](https://nuroctane.xyz/modkeys)

**Inspiration:** [thebuggeddev/modkeys](https://github.com/thebuggeddev/modkeys) — original project this configurator builds on.

---

## Features

- **Desktop + mobile shells** — purpose-built layouts (not a shrunk desktop). Mobile boots a dedicated shell via `matchMedia` with bottom tabs, stage icon bar, and safe-area handling
- **3D keyboard preview** powered by Three.js — orbit, pan, and zoom (mouse, trackpad, or touch)
- **Multiple layouts**: 60% Compact, 65% Standard, 75% Pro (with rotary knob)
- **Keycap profiles**: Cherry, OEM, XDA, SA, DSA, MT3, ASA — accurate geometry, dish, and row tilt
- **Colorways**: 19 curated presets (Claude, Gemini, Sakura, Verdant, Abyssal, Dune, Monochrome, Umbra, Moss, Contrast, Rosette, Noir, Embers, Matcha, Carbon, Vaporwave, Dracula, Blush, Honey) plus full custom colors
- **Custom colors**: Alpha, mod, and accent keys with live hex preview
- **Per-key customization**: Text, font size, foreground/background, glow, image upload, emoji marks
- **Case & plate**: 16 case presets + free color pickers; 3 finishes; 8 plate materials with texture maps + tint
- **Switches**: 10 types with stem color picker (overrides default stem tint)
- **Lighting**: Wave, Static, Breathe, or Off — swatches + free color picker + brightness; underglow and per-key glow (GLSL)
- **Extras**: Rotary knob, coiled cable, walnut wrist rest, switch lubing service
- **Undo/Redo**: History stack (up to 50 states) with keyboard shortcuts
- **Export**: KLE JSON, SVG manufacturing template, full spec sheet JSON, and PDF
- **Share**: URL-encoded build state (base64 hash fragment)
- **Presets**: 15 featured builds
- **Save builds**: Local gallery of saved creations
- **Dark/Light theme**: Toggle with adjusted 3D lighting

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Build** | [Vite 6](https://vitejs.dev) |
| **JavaScript** | Vanilla ES modules (no framework) |
| **3D** | [Three.js](https://threejs.org) (^0.184) — WebGL, soft shadows, PMREM environment, custom GLSL |
| **Animation** | [GSAP](https://gsap.com) (^3.12) |
| **Audio** | Web Audio API (procedural synthesis; no audio files) |
| **Emoji** | [Twemoji](https://github.com/jdecked/twemoji) via CDN |
| **CSS** | Vanilla CSS + custom properties; desktop in `layout.css` / `components.css`; mobile in `mobile.css` |
| **Shell** | Dual layout: desktop `#dShell` + mobile `<template id="mShellTpl">`, selected at boot by `shell.js` |
| **Export** | KLE, SVG, JSON spec, PDF via [jsPDF](https://github.com/parallax/jsPDF) + svg2pdf.js |

---

## Project Structure

```
index.html              Main SPA — desktop shell + mobile template
MOBILE_SHELL.md         Dual-shell architecture notes
check-shell-ids.mjs     ID parity checker (desktop ↔ mobile)
check-spa-shell.mjs     SPA shell integrity check
src/
  css/
    variables.css       Theme tokens (light/dark)
    layout.css          Desktop grid (no responsive @media)
    components.css      Desktop components
    mobile.css          Mobile shell (.mShell / html.mk-mobile)
  js/
    app.js              Entry — modules + render loop
    shell.js            Desktop vs mobile selection at boot
    core/
      state.js          Mutable state + serialization
      scene.js          Three.js scene, materials, shaders
      keyboard.js       Geometry, profiles, legend textures
      controls.js       Camera, pointer/touch, key picking
      update.js         State → 3D pipeline, undo/redo
      history.js        Undo stack (max 50)
      shrinker.js       URL serialization (base64)
      perKey.js         Per-key overrides
      imageLoader.js    Images + canvas text
    data/
      layouts.js        60% / 65% / 75%
      colorways.js      19 presets + swatches
      components.js     Cases, plates, switches, extras, profiles
      presets.js        Featured builds
      art.js            Marks, brand SVGs, emoji defs
    ui/
      panels.js         Config panels + key editor
      modals.js         Gallery, Library, Switches, Accessories
      theme.js          Light/dark + 3D lighting
      toast.js          Toasts
      sound.js          Switch sound synthesis
    export/
      kle.js            KLE JSON
      svg.js            SVG template
      pdf.js            PDF
      spec.js           Spec sheet JSON
```

---

## Usage

### Builder
3D keyboard center stage.

**Desktop:** sidebar sections —  
**Layout** → **Keycaps** → **Switches** → **Case** → **Plate** → **Lighting** → **Extras**

**Mobile:** the same sections as bottom **section tabs**.

### 3D Controls
- **Orbit** — click/drag or one-finger drag
- **Pan** — hand icon or Shift + drag
- **Zoom** — scroll wheel or pinch
- **Views** — 3D, Explode, Top, Side, Front via pills above the canvas (desktop) or the stage-bottom icon bar (mobile)

### Mobile

On phones and tablets a dedicated mobile shell swaps in at boot (`matchMedia`). Purpose-built, not a scaled desktop:
- **View pills** as a bottom icon bar (all five views fit portrait)
- **Section tabs** for Layout → … → Extras
- **Save / Export** in a fixed bottom bar; Export opens a sheet (KLE, SVG, PDF, spec)
- **Material sounds** on key tap (PBT thock; ABS/Ceramic add resonance)
- **Safe-area + `dvh`** for notches and home bars
- **Breakpoint**: `(max-width: 768px)` or coarse pointer up to `1024px`. Crossing reloads so the correct shell binds (see `MOBILE_SHELL.md`)

### Per-key Customization
Double-click a key (desktop) to open the key editor — text, colors, glow, images.

### Sharing
Share icon copies a URL that encodes the current build.

---

## License

MIT

---

*Built with curiosity by [nur](https://github.com/anomalyco)*
