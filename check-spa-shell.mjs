#!/usr/bin/env node
/* Post-build guard for the modkeys mobile shell on the SPA.
 *
 * Five consecutive "fixes" shipped green builds while the phone showed the
 * desktop shell, because verification stopped at "build passed". This check
 * inspects the BUILT ModkeysPage chunk — the exact bytes the phone downloads —
 * and fails the build unless it contains:
 *   1. the mobile.css sentinel  (proves the stylesheet is in the bundle)
 *   2. the mShellHost marker    (proves React renders the mobile shell natively)
 *   3. the mk-mobile class ref  (proves shell.js classing survives)
 * Run from repo root: node artifacts/modkeys/check-spa-shell.mjs
 * Wired into the root build script, so it also runs inside Vercel's deploy. */
import fs from 'node:fs';
import path from 'node:path';

const assetsDir = path.resolve('artifacts/digital-sea/dist/public/assets');
if (!fs.existsSync(assetsDir)) {
  console.error('check-spa-shell: dist assets not found — run the digital-sea build first');
  process.exit(1);
}
const chunk = fs.readdirSync(assetsDir).find((f) => /^ModkeysPage-.*\.js$/.test(f));
if (!chunk) {
  console.error('check-spa-shell: no ModkeysPage-*.js chunk in dist');
  process.exit(1);
}
const src = fs.readFileSync(path.join(assetsDir, chunk), 'utf-8');

const musts = [
  ['__MODKEYS_MOBILE_CSS_v072__', 'mobile.css sentinel (stylesheet bundled)'],
  ['mShellHost', 'React-rendered mobile shell host'],
  ['mk-mobile', 'mk-mobile class reference'],
];
let fail = 0;
for (const [needle, why] of musts) {
  if (!src.includes(needle)) {
    console.error(`check-spa-shell FAIL: "${needle}" missing from ${chunk} — ${why}`);
    fail++;
  }
}

/* ---- v0.73 source-level guards ----
 * (a) The desktop .snav family must stay .dShell-scoped. An unscoped .snav
 *     rule leaks into the mobile tabs (they share the class) — that was the
 *     flex-direction:column leak that stacked the tab pills full-width.
 * (b) No inline style band-aids on the tab nav/buttons in either template
 *     mirror — fixes go in mobile.css or they don't go in.
 * (c) mobile.css must explicitly declare row direction on .mTabs. */
const cssFiles = ['artifacts/modkeys/src/css/layout.css', 'artifacts/modkeys/src/css/components.css'];
for (const f of cssFiles) {
  const css = fs.readFileSync(path.resolve(f), 'utf-8');
  for (const [i, line] of css.split('\n').entries()) {
    if (/^\s*\.snav[\s.{:]/.test(line) || /,\s*\.snav[\s.]/.test(line)) {
      console.error(`check-spa-shell FAIL: unscoped .snav selector in ${f}:${i + 1} — scope it under .dShell`);
      fail++;
    }
  }
}
const mobileCssRaw = fs.readFileSync(path.resolve('artifacts/modkeys/src/css/mobile.css'), 'utf-8');
const mobileCss = mobileCssRaw.replace(/\/\*[\s\S]*?\*\//g, ''); // comments may quote braces
const mTabsBlock = mobileCss.match(/\.mShell \.mTabs \{[^}]*\}/)?.[0] ?? '';
if (!/flex-direction:\s*row/.test(mTabsBlock)) {
  console.error('check-spa-shell FAIL: .mShell .mTabs must declare flex-direction: row explicitly');
  fail++;
}
const idxHtml = fs.readFileSync(path.resolve('artifacts/modkeys/index.html'), 'utf-8');
const tsxSrc = fs.readFileSync(path.resolve('artifacts/digital-sea/src/pages/ModkeysPage.tsx'), 'utf-8');
for (const [name, doc] of [['index.html', idxHtml], ['ModkeysPage.tsx', tsxSrc]]) {
  if (/data-sec="[a-z]+"[^>]*style="/.test(doc) || /class="snav mTabs"[^>]*style="/.test(doc)) {
    console.error(`check-spa-shell FAIL: inline style band-aid on tab nav/buttons in ${name} — use mobile.css`);
    fail++;
  }
}

if (fail) process.exit(1);
console.log(`SPA SHELL OK — ${chunk} contains mobile css sentinel + shell host + class ref; .snav scoping + tab hygiene verified`);
