import { state } from '../core/state.js';
import { LAYOUTS } from '../data/layouts.js';
import { generateSVG } from './svg.js';

export async function exportPDF() {
  const L = LAYOUTS[state.layout];
  const cwName = state.customColors ? 'Custom' : state.colorway;
  const svgString = generateSVG();

  // Parse SVG dimensions
  const tmp = document.createElement('div');
  tmp.innerHTML = svgString;
  const svgEl = tmp.querySelector('svg');
  if (!svgEl) throw new Error('Failed to parse SVG');
  const maxW = parseFloat(svgEl.getAttribute('width')) || 200;
  const totalH = parseFloat(svgEl.getAttribute('height')) || 100;

  const { jsPDF } = await import('jspdf');
  await import('svg2pdf.js'); // side effect: registers doc.svg on jsPDF

  const doc = new jsPDF({ unit: 'mm', format: [maxW + 20, totalH + 30] });
  await doc.svg(svgEl, { x: 10, y: 10, width: maxW, height: totalH });
  doc.setFontSize(8);
  const lightBit = `${state.light.mode}/${state.light.color}`;
  doc.text(
    `MODKEYS — ${LAYOUTS[state.layout].pct} — ${cwName} — ${state.profile} — ${state.sw} — ${lightBit} — ${new Date().toISOString().slice(0, 10)}`,
    10,
    totalH + 22,
  );
  doc.save(`modkeys-${state.layout}-${cwName}.pdf`);
}
