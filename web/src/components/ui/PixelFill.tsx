import { useEffect } from 'react';

import styles from './PixelFill.module.scss';

// Buttons styled with the `pixel-fill` mixin carry `--pixel: 1` and a
// `--pixel-color`. This manager finds them anywhere in the tree (including
// modals mounted later) and injects a grid of small square cells that flood in
// in a pseudo-random order on hover — the "pixel dissolve" effect. Doing it
// globally keeps every button's JSX untouched; doing it in JS is unavoidable
// because each cell needs its own random delay, which CSS can't express.

const CELL = 12; // px — size of each pixel square
const MAX_DELAY = 0.34; // s — spread of the random reveal

export default function PixelFill() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const enhanced = new WeakSet<HTMLElement>();

    const enhance = (el: HTMLElement) => {
      if (enhanced.has(el)) return;
      if (getComputedStyle(el).getPropertyValue('--pixel').trim() !== '1') {
        return;
      }
      enhanced.add(el);

      const grid = document.createElement('span');
      grid.className = styles.grid;
      grid.setAttribute('aria-hidden', 'true');
      el.appendChild(grid);

      const build = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (!w || !h) return;
        const cols = Math.max(1, Math.ceil(w / CELL));
        const rows = Math.max(1, Math.ceil(h / CELL));
        if (grid.childElementCount === cols * rows) return;

        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        grid.replaceChildren();

        const frag = document.createDocumentFragment();
        for (let i = 0; i < cols * rows; i++) {
          const cell = document.createElement('span');
          cell.className = styles.cell;
          cell.style.transitionDelay = `${(Math.random() * MAX_DELAY).toFixed(3)}s`;
          frag.appendChild(cell);
        }
        grid.appendChild(frag);
      };

      build();
      const ro = new ResizeObserver(build);
      ro.observe(el);

      el.addEventListener('mouseenter', () => grid.classList.add(styles.active));
      el.addEventListener('mouseleave', () =>
        grid.classList.remove(styles.active),
      );
    };

    const scan = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>('button, a').forEach(enhance);
    };

    scan(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches('button, a')) enhance(node);
          scan(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
