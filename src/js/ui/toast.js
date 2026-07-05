export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  const gsap = window.gsap;
  gsap.killTweensOf(el);
  gsap.set(el, { opacity: 0, y: -16 });
  gsap.to(el, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' });
  gsap.to(el, {
    opacity: 0, y: -12, duration: 0.24, ease: 'power2.in',
    delay: 1.8, onComplete: () => { el.textContent = ''; },
  });
}
