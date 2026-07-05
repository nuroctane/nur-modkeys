export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function composeLegend(opts) {
  const { text, imageData, imageBehindText, fgColor, fontSize, wU, glow } = opts;
  const S = 2;
  const W = Math.max(128, Math.round(128 * (wU || 1))) * S;
  const H = 128 * S;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const pad = 17 * S;

  if (imageData) {
    const img = new Image();
    img.src = imageData;
    const iw = img.naturalWidth || W;
    const ih = img.naturalHeight || H;
    const scale = Math.min((W - pad * 2) / iw, (H - pad * 2) / ih);
    const dw = iw * scale, dh = ih * scale;
    g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    if (imageBehindText && text) {
      renderText(g, text, fgColor, fontSize || 29, W, H, S, pad);
    }
  } else if (text) {
    renderText(g, text, fgColor, fontSize || 29, W, H, S, pad);
  }
  return c;
}

function renderText(g, text, fg, fs, W, H, S, pad) {
  const F = '"Inter","Segoe UI",Arial,sans-serif';
  g.fillStyle = fg || '#000000';
  g.textBaseline = 'top';
  const lines = text.split('\n');
  if (lines.length === 2) {
    g.font = '700 ' + 27 * S + 'px ' + F;
    g.fillText(lines[0], pad, pad);
    g.fillText(lines[1], pad, pad + 44 * S);
  } else {
    let fontSize = fs * S;
    g.font = '700 ' + fontSize + 'px ' + F;
    while (g.measureText(text).width > W - pad * 2 && fontSize > 15 * S) {
      fontSize--;
      g.font = '700 ' + fontSize + 'px ' + F;
    }
    g.fillText(text, pad, pad + 4 * S);
  }
}
