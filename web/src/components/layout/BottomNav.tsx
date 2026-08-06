import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

import { useCartCount } from '../../hooks/queries/useCart';
import styles from './BottomNav.module.scss';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.item} ${isActive ? styles.active : ''}`;

// One drawing system for the whole bar, so the row reads as a set rather
// than five icons borrowed from five places: a 24px box, 1.6 stroke, round
// caps and joins, no fills, and every glyph built on the same 4.5/19.5
// margins. Geometry over illustration — the shapes say what they are at
// 22px without any interior detail.
const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const homeIcon = (
  <svg viewBox="0 0 24 24">
    <path
      d="M4.5 10.2 12 4.5l7.5 5.7v8.3a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8.3Z"
      {...STROKE}
    />
  </svg>
);

const catalogIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M4.5 6.5h6v11h-6z" {...STROKE} />
    <path d="M13.5 6.5h6v6h-6z" {...STROKE} />
    <path d="M13.5 15.5h6v2h-6z" {...STROKE} />
  </svg>
);

const cartIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M4.5 5.5h2l1.7 9h9l1.8-6.5H7.2" {...STROKE} />
    <circle cx="10" cy="18.3" r="1.2" {...STROKE} />
    <circle cx="16.5" cy="18.3" r="1.2" {...STROKE} />
  </svg>
);

const ordersIcon = (
  <svg viewBox="0 0 24 24">
    <path
      d="M6.5 4.5h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z"
      {...STROKE}
    />
    <path d="M9 9h6M9 12.5h6M9 16h3.5" {...STROKE} />
  </svg>
);

const galleryIcon = (
  <svg viewBox="0 0 24 24">
    <path
      d="M4.5 5.5h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"
      {...STROKE}
    />
    <path
      d="m4.5 16 4.3-4.3a1 1 0 0 1 1.4 0l2.3 2.3m0 0 2.3-2.3a1 1 0 0 1 1.4 0l2.3 2.3"
      {...STROKE}
    />
    <circle cx="9" cy="9" r="1.1" {...STROKE} />
  </svg>
);

// Primary navigation on phones, down where the thumb already is. The header
// keeps only what's occasional up top — theme, support, profile, the rest of
// the menu. Hidden from $breakpoint-lg, where the header's own nav takes over.
export default function BottomNav() {
  const cartCount = useCartCount();
  const barRef = useRef<HTMLElement>(null);

  // Publishes its real height the same way the header does. Several layouts
  // size themselves against the viewport minus both bars (the hero, the
  // painting, the chat panes), and a hardcoded guess would drift the moment
  // this bar's padding changes.
  useEffect(() => {
    const element = barRef.current;
    if (!element) return;

    const publish = () => {
      document.documentElement.style.setProperty(
        '--bottom-nav-height',
        `${element.offsetHeight}px`,
      );
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--bottom-nav-height');
    };
  }, []);

  return (
    <nav ref={barRef} className={styles.bar} aria-label="Основна навігація">
      <NavLink to="/" className={linkClass} end>
        {homeIcon}
        <span>Головна</span>
      </NavLink>

      <NavLink to="/catalog" className={linkClass}>
        {catalogIcon}
        <span>Каталог</span>
      </NavLink>

      <NavLink to="/cart" className={linkClass}>
        <span className={styles.iconWrap}>
          {cartIcon}
          {cartCount > 0 && (
            <span className={styles.badge} aria-hidden="true">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </span>
        <span>Кошик</span>
      </NavLink>

      <NavLink to="/orders" className={linkClass}>
        {ordersIcon}
        <span>Замовлення</span>
      </NavLink>

      <NavLink to="/gallery" className={linkClass}>
        {galleryIcon}
        <span>Галерея</span>
      </NavLink>
    </nav>
  );
}
