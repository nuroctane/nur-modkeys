#!/usr/bin/env node
/* Shell ID parity checker (v0.70 mobile shell architecture).
 * Every element ID the JS core binds must exist in BOTH the desktop shell
 * (#dShell subtree + shared overlays) and the mobile shell (template
 * #mShellTpl + shared overlays), or be declared in the allowlists below.
 * Run: node check-shell-ids.mjs   (from artifacts/modkeys) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, 'index.html'), 'utf-8');

/* ids created at runtime by renderPanel/modals, or intentionally
   single-shell (guarded with ?. or if-exists in app.js) */
const DYNAMIC = new Set([
  'hexAbg','hexAfg','hexMbg','hexMfg','hexXbg','hexXfg',   // custom color inputs (panel render)
  'keGlow','keImgBehind','keSidebarPreview',               // key editor internals (panel render)
  'communityGrid','galleryRetry',                          // gallery modal render
]);
const DESKTOP_ONLY = new Set(['builds','scrollL','scrollR']); // featured strip; guarded in app.js
const MOBILE_ONLY = new Set(['mExportToggle','mExportMenu']);  // export sheet; guarded in app.js
const INFRA = new Set(['dShell','mShellTpl']);                 // the swap mechanism itself

/* collect ids referenced across src/js */
const refs = new Set();
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walk(fp);
    else if (f.endsWith('.js')) {
      const src = fs.readFileSync(fp, 'utf-8');
      for (const m of src.matchAll(/getElementById\('([A-Za-z]+)'\)|\$\('([A-Za-z]+)'\)/g)) {
        refs.add(m[1] || m[2]);
      }
    }
  }
};
walk(path.join(here, 'src/js'));

/* split the document into shells */
const tplStart = html.indexOf('<template id="mShellTpl">');
const tplEnd = html.indexOf('</template>', tplStart);
if (tplStart === -1 || tplEnd === -1) { console.error('mShellTpl not found'); process.exit(1); }
const mShell = html.slice(tplStart, tplEnd);
const dStart = html.search(/<div class="app dShell" id="dShell">/);
if (dStart === -1) { console.error('#dShell (class app dShell) not found'); process.exit(1); }
const dShell = html.slice(dStart, tplStart);
/* shared overlays: everything after the template close (kePop, modal, toast)
   plus the loader before #dShell */
const shared = html.slice(0, dStart) + html.slice(tplEnd);

const idsIn = (chunk) => new Set([...chunk.matchAll(/id="([A-Za-z]+)"/g)].map((m) => m[1]));
const dIds = idsIn(dShell), mIds = idsIn(mShell), sIds = idsIn(shared);

let fail = 0;
for (const id of [...refs].sort()) {
  if (DYNAMIC.has(id) || INFRA.has(id)) continue;
  const inD = dIds.has(id) || sIds.has(id);
  const inM = mIds.has(id) || sIds.has(id);
  if (DESKTOP_ONLY.has(id)) {
    if (!inD) { console.error(`FAIL ${id}: desktop-only id missing from desktop shell`); fail++; }
    continue;
  }
  if (MOBILE_ONLY.has(id)) {
    if (!inM) { console.error(`FAIL ${id}: mobile-only id missing from mobile shell`); fail++; }
    continue;
  }
  if (!inD) { console.error(`FAIL ${id}: missing from desktop shell`); fail++; }
  if (!inM) { console.error(`FAIL ${id}: missing from mobile shell`); fail++; }
}

/* duplicate-id guard within each shell */
for (const [name, chunk] of [['dShell', dShell], ['mShell', mShell], ['shared', shared]]) {
  const seen = new Map();
  for (const m of chunk.matchAll(/id="([A-Za-z]+)"/g)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
  for (const [id, n] of seen) if (n > 1) { console.error(`FAIL duplicate id "${id}" x${n} in ${name}`); fail++; }
}

if (fail) { console.error(`\n${fail} parity failure(s)`); process.exit(1); }
console.log(`ID PARITY OK — ${refs.size} JS-referenced ids checked against both shells`);
