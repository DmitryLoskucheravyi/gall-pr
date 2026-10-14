// The "added to cart" moment: a small copy of the painting leaves the place
// the buyer pressed and arcs into the cart icon, which gives a little jump as
// it lands. It starts from the last press rather than from a named element,
// so every buy button on the site — the catalogue card, a series row, the
// painting's own page — gets it without passing anything in.
//
// The target is whichever cart icon is on screen: the header's on a desktop,
// the bottom bar's on a phone. Both carry data-cart-target.

let lastPress: { x: number; y: number } | null = null;
let listening = false;

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener(
    'pointerdown',
    (event) => {
      lastPress = { x: event.clientX, y: event.clientY };
    },
    { capture: true, passive: true },
  );
}

// Installed as soon as this module is loaded, so the first press is caught.
listen();

function visibleTarget(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'));
  return (
    candidates.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    }) ?? null
  );
}

function bump(target: HTMLElement): Promise<void> {
  const anim = target.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.28) rotate(-6deg)', offset: 0.35 },
      { transform: 'scale(0.94) rotate(3deg)', offset: 0.7 },
      { transform: 'scale(1)' },
    ],
    { duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  );
  return anim.finished.then(
    () => undefined,
    () => undefined,
  );
}

// Resolves once the cart has taken the painting — after the landing and the
// jump — so the caller can say "added" then, not over the top of it. On a
// phone the toast sits right on the bottom bar's cart icon, and shown at once
// it hid the very moment this exists for.
export function flyToCart(imageUrl: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const target = visibleTarget();
  if (!target) return Promise.resolve();

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !lastPress) return bump(target);

  const to = target.getBoundingClientRect();
  // Large enough to read as the painting on a phone, not a speck.
  const size = window.innerWidth < 640 ? 108 : 84;
  const from = lastPress;
  const endX = to.left + to.width / 2 - from.x;
  const endY = to.top + to.height / 2 - from.y;
  // The arc's peak: above whichever of the two points is higher.
  const liftY = Math.min(0, endY) - 120;

  const flyer = document.createElement('img');
  flyer.src = imageUrl;
  flyer.alt = '';
  flyer.setAttribute('aria-hidden', 'true');
  Object.assign(flyer.style, {
    position: 'fixed',
    left: `${from.x - size / 2}px`,
    top: `${from.y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'cover',
    zIndex: '10001',
    pointerEvents: 'none',
    boxShadow: '0 10px 28px rgb(0 0 0 / 28%)',
    border: '2px solid #f6f2ea',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(flyer);

  const flight = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(0.6) rotate(0deg)', opacity: 0 },
      { transform: 'translate(0, -16px) scale(1) rotate(-4deg)', opacity: 1, offset: 0.12 },
      {
        transform: `translate(${endX * 0.5}px, ${liftY}px) scale(0.75) rotate(6deg)`,
        opacity: 1,
        offset: 0.5,
      },
      { transform: `translate(${endX}px, ${endY}px) scale(0.2) rotate(12deg)`, opacity: 0.6 },
    ],
    { duration: 1000, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
  );

  return flight.finished.then(
    () => {
      flyer.remove();
      return bump(target);
    },
    () => {
      flyer.remove();
    },
  );
}
