export function encodeState(stateObj) {
  try {
    const json = JSON.stringify(stateObj);
    return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  } catch { return ''; }
}

export function decodeState(str) {
  try {
    const json = decodeURIComponent(atob(str).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    return JSON.parse(json);
  } catch { return null; }
}

export function shareURL(stateObj) {
  const enc = encodeState(stateObj);
  if (!enc) return '';
  const u = new URL(window.location.href);
  u.hash = enc;
  return u.href;
}

export function loadHash() {
  if (!window.location.hash) return null;
  return decodeState(window.location.hash.slice(1));
}
