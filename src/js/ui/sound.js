let AC = null;

export function playSwitch(type) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime;
    const cfg = {
      thock: [95, 0.1, 0.13],
      tactile: [135, 0.08, 0.11],
      clicky: [1750, 0.03, 0.09],
      silent: [72, 0.06, 0.05],
    }[type] || [120, 0.07, 0.1];
    const g = AC.createGain();
    g.connect(AC.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(cfg[2], t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + cfg[1] + 0.06);
    const o = AC.createOscillator();
    o.type = type === 'clicky' ? 'square' : 'sine';
    o.frequency.setValueAtTime(cfg[0], t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, cfg[0] * 0.45), t + cfg[1]);
    o.connect(g);
    o.start(t);
    o.stop(t + cfg[1] + 0.08);
    const nb = AC.createBuffer(1, 2205, 44100), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
    const ns = AC.createBufferSource();
    ns.buffer = nb;
    const nf = AC.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = type === 'clicky' ? 6500 : type === 'silent' ? 450 : 1100;
    const ng = AC.createGain();
    ng.gain.value = type === 'silent' ? 0.015 : 0.05;
    ns.connect(nf);
    nf.connect(ng);
    ng.connect(AC.destination);
    ns.start(t);
  } catch (e) {}
}
