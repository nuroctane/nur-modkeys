/**
 * Community gallery admin (desktop SPA).
 * Password = BOOKS_ADMIN_PASSWORD (same as /books).
 * Dialog chrome reuses digital-sea `.bs-*` classes from index.css.
 */

const ADMIN_FLAG = 'book-admin';
const ADMIN_PW = 'book-admin-pw';

function isDesktop() {
  return !document.documentElement.classList.contains('mk-mobile');
}

export function getAdminState() {
  const fromWin = window.__MODKEYS_ADMIN__;
  if (fromWin && typeof fromWin.isAdmin === 'boolean') {
    return {
      isAdmin: !!fromWin.isAdmin && isDesktop(),
      password: fromWin.password || sessionStorage.getItem(ADMIN_PW) || '',
    };
  }
  return {
    isAdmin: sessionStorage.getItem(ADMIN_FLAG) === '1' && isDesktop(),
    password: sessionStorage.getItem(ADMIN_PW) || '',
  };
}

export function publishAdminState({ isAdmin, password }) {
  const next = {
    isAdmin: !!isAdmin,
    password: password || '',
  };
  window.__MODKEYS_ADMIN__ = next;
  if (next.isAdmin) {
    sessionStorage.setItem(ADMIN_FLAG, '1');
    if (next.password) sessionStorage.setItem(ADMIN_PW, next.password);
  } else {
    sessionStorage.removeItem(ADMIN_FLAG);
    sessionStorage.removeItem(ADMIN_PW);
  }
  window.dispatchEvent(new CustomEvent('modkeys-admin-change', { detail: next }));
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function removeOverlay() {
  document.getElementById('mkAdminOverlay')?.remove();
}

/**
 * Books-page-identical admin password dialogue (digital-sea chrome).
 * @returns {Promise<string|null>} password or null if cancelled
 */
export function promptAdminPassword() {
  return new Promise((resolve) => {
    removeOverlay();
    const root = document.createElement('div');
    root.id = 'mkAdminOverlay';
    root.className = 'bs-overlay';
    root.innerHTML = `
      <div class="bs-admin-prompt" role="dialog" aria-label="Admin access">
        <button type="button" class="bs-modal-close" data-mk-admin-x>✕</button>
        <div class="bs-admin-prompt-label">ADMIN ACCESS</div>
        <input class="bs-admin-prompt-input" type="password" placeholder="Password" autocomplete="current-password" data-mk-admin-pass />
        <div class="bs-admin-prompt-error" data-mk-admin-err style="display:none">Incorrect password</div>
        <button type="button" class="bs-admin-prompt-btn" data-mk-admin-go>UNLOCK</button>
      </div>`;
    document.body.appendChild(root);

    const input = root.querySelector('[data-mk-admin-pass]');
    const err = root.querySelector('[data-mk-admin-err]');
    const finish = (val) => {
      removeOverlay();
      resolve(val);
    };
    root.addEventListener('click', (e) => {
      if (e.target === root) finish(null);
    });
    root.querySelector('[data-mk-admin-x]')?.addEventListener('click', () => finish(null));

    const submit = async () => {
      const password = input?.value || '';
      if (!password) {
        if (err) { err.style.display = 'block'; err.textContent = 'Enter password'; }
        return;
      }
      try {
        const res = await fetch('/api/modkeys/gallery/verify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (res.ok) {
          publishAdminState({ isAdmin: true, password });
          finish(password);
        } else {
          if (err) { err.style.display = 'block'; err.textContent = 'Incorrect password'; }
          if (input) input.select();
        }
      } catch {
        if (err) { err.style.display = 'block'; err.textContent = 'Network error'; }
      }
    };
    root.querySelector('[data-mk-admin-go]')?.addEventListener('click', submit);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') finish(null);
    });
    input?.focus();
  });
}

/**
 * Books-style rename dialogue for a community build.
 * @returns {Promise<string|null>}
 */
export function promptRename(currentName) {
  return new Promise((resolve) => {
    removeOverlay();
    const root = document.createElement('div');
    root.id = 'mkAdminOverlay';
    root.className = 'bs-overlay';
    root.innerHTML = `
      <div class="bs-admin-prompt" role="dialog" aria-label="Rename build">
        <button type="button" class="bs-modal-close" data-mk-admin-x>✕</button>
        <div class="bs-admin-prompt-label">RENAME BUILD</div>
        <input class="bs-admin-prompt-input" type="text" maxlength="40" value="${esc(currentName)}" data-mk-admin-pass />
        <div class="bs-admin-prompt-error" data-mk-admin-err style="display:none"></div>
        <button type="button" class="bs-admin-prompt-btn" data-mk-admin-go>SAVE NAME</button>
      </div>`;
    document.body.appendChild(root);
    const input = root.querySelector('[data-mk-admin-pass]');
    const err = root.querySelector('[data-mk-admin-err]');
    const finish = (val) => {
      removeOverlay();
      resolve(val);
    };
    root.addEventListener('click', (e) => { if (e.target === root) finish(null); });
    root.querySelector('[data-mk-admin-x]')?.addEventListener('click', () => finish(null));
    const submit = () => {
      const name = (input?.value || '').trim();
      if (!name) {
        if (err) { err.style.display = 'block'; err.textContent = 'Name required'; }
        return;
      }
      finish(name.slice(0, 40));
    };
    root.querySelector('[data-mk-admin-go]')?.addEventListener('click', submit);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') finish(null);
    });
    input?.focus();
    input?.select();
  });
}

/**
 * Books-style confirm delete dialogue.
 * @returns {Promise<boolean>}
 */
export function promptDeleteConfirm(name) {
  return new Promise((resolve) => {
    removeOverlay();
    const root = document.createElement('div');
    root.id = 'mkAdminOverlay';
    root.className = 'bs-overlay';
    root.innerHTML = `
      <div class="bs-admin-prompt" role="dialog" aria-label="Delete build">
        <button type="button" class="bs-modal-close" data-mk-admin-x>✕</button>
        <div class="bs-admin-prompt-label">DELETE BUILD</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:#bdeff2;margin:0.4rem 0 0.8rem;line-height:1.45;opacity:0.9">
          Remove <strong style="color:#e85d5d">${esc(name)}</strong> from the community gallery? This cannot be undone.
        </div>
        <button type="button" class="bs-admin-prompt-btn" data-mk-admin-go style="border-color:rgba(232,93,93,0.35)">DELETE</button>
      </div>`;
    document.body.appendChild(root);
    const finish = (val) => {
      removeOverlay();
      resolve(val);
    };
    root.addEventListener('click', (e) => { if (e.target === root) finish(false); });
    root.querySelector('[data-mk-admin-x]')?.addEventListener('click', () => finish(false));
    root.querySelector('[data-mk-admin-go]')?.addEventListener('click', () => finish(true));
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        finish(false);
      }
    });
  });
}

export async function adminRenameBuild(id, name) {
  const { password } = getAdminState();
  const res = await fetch('/api/modkeys/gallery/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, id, name }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Rename failed');
  return res.json();
}

export async function adminDeleteBuild(id) {
  const { password } = getAdminState();
  const res = await fetch('/api/modkeys/gallery/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, id }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
  return res.json();
}

export function invalidateGalleryCache() {
  if (window.__MODKEYS__) window.__MODKEYS__.galleryCache = null;
}

export { esc, isDesktop };
