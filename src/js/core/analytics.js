/**
 * Optional product analytics. No hard dependency on @vercel/analytics.
 *
 * On the SPA, <Analytics /> injects the va script → events go to Vercel.
 * On standalone, inject() from the boot script does the same when present.
 * Elsewhere (local without inject, offline) this is a silent no-op.
 */

/**
 * @param {string} name  Event name (e.g. 'Modkeys Export')
 * @param {Record<string, string | number | boolean | null | undefined>} [properties]
 */
export function trackEvent(name, properties) {
  try {
    if (typeof window === 'undefined' || !name) return;
    const data = properties && typeof properties === 'object' ? properties : undefined;
    const payload = data ? { name, data } : { name };
    if (typeof window.va === 'function') {
      window.va('event', payload);
      return;
    }
    // Script not ready yet — queue for when Analytics/inject loads
    window.vaq = window.vaq || [];
    window.vaq.push(['event', payload]);
  } catch {
    /* analytics must never break the configurator */
  }
}
