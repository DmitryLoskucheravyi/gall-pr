import { useEffect, type RefObject } from 'react';

const POINTS = 8;
const VISCOSITY = 20;
const MOUSE_DIST = 70;
const DAMPING = 0.05;

class LiquidPoint {
  x: number;
  y: number;
  ix: number;
  iy: number;
  vx = 0;
  vy = 0;
  cx1 = 0;
  cy1 = 0;
  level: number;

  constructor(x: number, y: number, level: number) {
    this.x = this.ix = 50 + x;
    this.y = this.iy = 50 + y;
    this.level = level;
  }

  move(
    relMouseX: number,
    relMouseY: number,
    mouseDirX: number,
    mouseDirY: number,
    mouseSpeedX: number,
    mouseSpeedY: number,
  ) {
    this.vx += (this.ix - this.x) / (VISCOSITY * this.level);
    this.vy += (this.iy - this.y) / (VISCOSITY * this.level);

    const dx = this.ix - relMouseX;
    const dy = this.iy - relMouseY;
    const relDist = 1 - Math.sqrt(dx * dx + dy * dy) / MOUSE_DIST;

    if (
      (mouseDirX > 0 && relMouseX > this.x) ||
      (mouseDirX < 0 && relMouseX < this.x)
    ) {
      if (relDist > 0 && relDist < 1) this.vx = (mouseSpeedX / 4) * relDist;
    }
    this.vx *= 1 - DAMPING;
    this.x += this.vx;

    if (
      (mouseDirY > 0 && relMouseY > this.y) ||
      (mouseDirY < 0 && relMouseY < this.y)
    ) {
      if (relDist > 0 && relDist < 1) this.vy = (mouseSpeedY / 4) * relDist;
    }
    this.vy *= 1 - DAMPING;
    this.y += this.vy;
  }
}

// One shared document mousemove listener + speed sampler for every
// mounted liquid button, instead of each instance wiring its own.
const mouse = {
  x: 0,
  y: 0,
  lastX: 0,
  lastY: 0,
  dirX: 0,
  dirY: 0,
  speedX: 0,
  speedY: 0,
};

let subscribers = 0;
let speedIntervalId: ReturnType<typeof setInterval> | null = null;

function handleMouseMove(e: MouseEvent) {
  mouse.dirX = e.pageX > mouse.x ? 1 : e.pageX < mouse.x ? -1 : 0;
  mouse.dirY = e.pageY > mouse.y ? 1 : e.pageY < mouse.y ? -1 : 0;
  mouse.x = e.pageX;
  mouse.y = e.pageY;
}

function sampleSpeed() {
  mouse.speedX = mouse.x - mouse.lastX;
  mouse.speedY = mouse.y - mouse.lastY;
  mouse.lastX = mouse.x;
  mouse.lastY = mouse.y;
}

function subscribeMouseTracker() {
  subscribers += 1;
  if (subscribers === 1) {
    document.addEventListener('mousemove', handleMouseMove);
    speedIntervalId = setInterval(sampleSpeed, 50);
  }

  return () => {
    subscribers -= 1;
    if (subscribers === 0) {
      document.removeEventListener('mousemove', handleMouseMove);
      if (speedIntervalId) clearInterval(speedIntervalId);
      speedIntervalId = null;
    }
  };
}

function buildOutline(width: number, height: number) {
  const pointsA: LiquidPoint[] = [];
  const pointsB: LiquidPoint[] = [];

  const add = (x: number, y: number) => {
    pointsA.push(new LiquidPoint(x, y, 1));
    pointsB.push(new LiquidPoint(x, y, 2));
  };

  const x = height / 2;
  for (let j = 1; j < POINTS; j++) {
    add(x + ((width - height) / POINTS) * j, 0);
  }
  add(width - height / 5, 0);
  add(width + height / 10, height / 2);
  add(width - height / 5, height);
  for (let j = POINTS - 1; j > 0; j--) {
    add(x + ((width - height) / POINTS) * j, height);
  }
  add(height / 5, height);
  add(-height / 10, height / 2);
  add(height / 5, 0);

  return { pointsA, pointsB };
}

function drawBlob(context: CanvasRenderingContext2D, blob: LiquidPoint[]) {
  context.beginPath();
  context.moveTo(blob[0].x, blob[0].y);

  for (let i = 0; i < blob.length; i++) {
    const p = blob[i];
    const next = blob[i + 1] ?? blob[0];
    p.cx1 = (p.x + next.x) / 2;
    p.cy1 = (p.y + next.y) / 2;
    context.bezierCurveTo(p.x, p.y, p.cx1, p.cy1, p.cx1, p.cy1);
  }

  context.fill();
}

export function useLiquidButton(
  containerRef: RefObject<HTMLElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const colorBack = rootStyle.getPropertyValue('--color-primary').trim();
    const colorFrontNear = rootStyle.getPropertyValue('--color-accent').trim();
    const colorFrontFar = rootStyle.getPropertyValue('--color-primary').trim();

    let pointsA: LiquidPoint[] = [];
    let pointsB: LiquidPoint[] = [];
    let rafId = 0;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      canvas.width = width + 100;
      canvas.height = height + 100;
      const built = buildOutline(width, height);
      pointsA = built.pointsA;
      pointsB = built.pointsB;
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const unsubscribeMouse = subscribeMouseTracker();

    const render = () => {
      rafId = requestAnimationFrame(render);

      const rect = canvas.getBoundingClientRect();
      const canvasDocLeft = rect.left + window.scrollX;
      const canvasDocTop = rect.top + window.scrollY;
      const relMouseX = mouse.x - canvasDocLeft;
      const relMouseY = mouse.y - canvasDocTop;

      context.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < pointsA.length; i++) {
        pointsA[i].move(
          relMouseX,
          relMouseY,
          mouse.dirX,
          mouse.dirY,
          mouse.speedX,
          mouse.speedY,
        );
        pointsB[i].move(
          relMouseX,
          relMouseY,
          mouse.dirX,
          mouse.dirY,
          mouse.speedX,
          mouse.speedY,
        );
      }

      context.fillStyle = colorBack;
      drawBlob(context, pointsA);

      const gradientX = Math.min(Math.max(relMouseX, 0), canvas.width);
      const gradientY = Math.min(Math.max(relMouseY, 0), canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      const distance =
        Math.sqrt((gradientX - cx) ** 2 + (gradientY - cy) ** 2) / maxDist;

      const gradient = context.createRadialGradient(
        gradientX,
        gradientY,
        maxDist * (0.6 + 0.6 * distance),
        gradientX,
        gradientY,
        0,
      );
      gradient.addColorStop(0, colorFrontNear);
      gradient.addColorStop(1, colorFrontFar);
      context.fillStyle = gradient;
      drawBlob(context, pointsB);
    };

    render();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      unsubscribeMouse();
    };
  }, [containerRef, canvasRef]);
}
