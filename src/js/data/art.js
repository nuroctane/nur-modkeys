function drawClaudeMark(g, W, H, color) {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.34;
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineCap = "round";
  const spokes = 11;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    g.lineWidth = R * 0.13;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3);
    g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    g.stroke();
  }
  g.beginPath();
  g.arc(cx, cy, R * 0.17, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawGeminiMark(g, W, H, color) {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.42,
    ctrl = R * 0.16;
  const pts = [
    [0, -R],
    [R, 0],
    [0, R],
    [-R, 0],
  ];
  g.save();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx + pts[0][0], cy + pts[0][1]);
  for (let i = 0; i < 4; i++) {
    const nxt = pts[(i + 1) % 4],
      mx = (pts[i][0] + nxt[0]) / 2,
      my = (pts[i][1] + nxt[1]) / 2,
      len = Math.hypot(mx, my) || 1;
    g.quadraticCurveTo(
      cx + (mx / len) * ctrl,
      cy + (my / len) * ctrl,
      cx + nxt[0],
      cy + nxt[1],
    );
  }
  g.closePath();
  g.fill();
  g.restore();
}

function drawCat(g, W, H, color) {
  const cx = W / 2,
    cy = H / 2 + H * 0.04,
    r = Math.min(W, H) * 0.27;
  g.save();
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineWidth = r * 0.13;
  g.lineCap = "round";
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  [-1, 1].forEach((s) => {
    g.beginPath();
    g.moveTo(cx + s * r * 0.55, cy - r * 0.75);
    g.lineTo(cx + s * r * 0.95, cy - r * 1.5);
    g.lineTo(cx + s * r * 1.05, cy - r * 0.55);
    g.closePath();
    g.fill();
  });
  g.globalCompositeOperation = "destination-out";
  [-1, 1].forEach((s) => {
    g.beginPath();
    g.arc(cx + s * r * 0.38, cy - r * 0.05, r * 0.14, 0, Math.PI * 2);
    g.fill();
  });
  g.beginPath();
  g.arc(cx, cy + r * 0.28, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
  g.lineWidth = r * 0.1;
  g.stroke();
  g.restore();
}

function drawSakura(g, W, H, color) {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.36;
  g.save();
  g.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * R * 0.55,
      py = cy + Math.sin(a) * R * 0.55;
    g.beginPath();
    g.ellipse(px, py, R * 0.34, R * 0.5, a + Math.PI / 2, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.arc(cx, cy, R * 0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawStar(g, W, H, color) {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.4;
  g.save();
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2,
      rr = i % 2 ? R * 0.42 : R;
    const x = cx + Math.cos(a) * rr,
      y = cy + Math.sin(a) * rr;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
  g.fill();
  g.restore();
}

function drawHeart(g, W, H, color) {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.36;
  g.save();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx, cy + R * 0.75);
  g.bezierCurveTo(cx - R * 1.5, cy - R * 0.4, cx - R * 0.5, cy - R, cx, cy - R * 0.3);
  g.bezierCurveTo(cx + R * 0.5, cy - R, cx + R * 1.5, cy - R * 0.4, cx, cy + R * 0.75);
  g.closePath();
  g.fill();
  g.restore();
}

function drawDiamond(g, W, H, color) {
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.38;
  g.save();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx, cy - R);
  g.lineTo(cx + R, cy);
  g.lineTo(cx, cy + R);
  g.lineTo(cx - R, cy);
  g.closePath();
  g.fill();
  g.restore();
}

function drawWave(g, W, H, color) {
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.3;
  g.save();
  g.strokeStyle = color;
  g.lineWidth = R * 0.18;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx - R * 1.1, cy);
  for (let t = -1.1; t <= 1.1; t += 0.05) {
    g.lineTo(cx + t * R, cy + Math.sin(t * Math.PI * 2) * R * 0.5);
  }
  g.stroke();
  g.restore();
}

function drawHexagon(g, W, H, color) {
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.38;
  g.save();
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
  g.fill();
  g.restore();
}

function drawCrescent(g, W, H, color) {
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.35;
  g.save();
  g.fillStyle = color;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.arc(cx + R * 0.35, cy - R * 0.1, R * 0.75, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export const MARKS = {
  claude: drawClaudeMark,
  gemini: drawGeminiMark,
  cat: drawCat,
  blossom: drawSakura,
  sparkles: drawStar,
  heart: drawHeart,
  diamond: drawDiamond,
  wave: drawWave,
  hexagon: drawHexagon,
  crescent: drawCrescent,
};

export const EMOJI = {
  cat: "1f431",
  dog: "1f436",
  smile: "1f60a",
  cool: "1f60e",
  blossom: "1f338",
  sparkles: "2728",
  heart: "2764",
  fire: "1f525",
  rocket: "1f680",
  star: "2b50",
  diamond: "1f48e",
  wave: "1f30a",
  rainbow: "1f308",
  banana: "1f34c",
  gift: "1f381",
  crescent: "1f319",
  paw: "1f43e",
  bolt: "26a1",
  brain: "1f9e0",
  crown: "1f451",
};

export const emojiUrl = (cp) => "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/" + cp + ".png";

export const BRAND_MARKS = {
  claude: { Esc: "claude" },
  gemini: { Esc: "gemini" },
  sakura: { Esc: "cat", Enter: "blossom", Fn: "sparkles", Win: "heart" },
  cream: { Esc: "heart" },
  olive: { Esc: "diamond" },
  ocean: { Esc: "wave" },
  ewhite: { Esc: "diamond" },
  noir: { Esc: "crescent" },
  embers: { Esc: "wave", Enter: "sparkles" },
  matcha: { Esc: "hexagon" },
  carbon: { Esc: "hexagon" },
  vapor: { Esc: "wave" },
  dracula: { Esc: "crescent", Win: "sparkles" },
  blush: { Esc: "heart", Enter: "sparkles" },
  honey: { Esc: "hexagon" },
};

