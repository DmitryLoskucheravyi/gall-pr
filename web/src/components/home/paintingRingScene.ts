import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  WebGLRenderer,
  type Texture,
} from 'three';

// The featured works hung on a slow carousel ring, rendered with three.js.
//
// Plain module, no React: it is imported dynamically by PaintingRing only once
// the section is about to scroll into view, so three.js never weighs on the
// first screen of the homepage. Everything it creates is released in
// destroy() — the homepage is navigated away from and back to constantly.
//
// The ring turns around its own vertical axis in front of a fixed camera. The
// work facing the camera is the "active" one: lit fully, a touch larger, and
// reported up to the caption. The rest fall back into shade with distance
// around the ring. Drag to spin it (with momentum), click a side work to bring
// it round, click the front one to open it.

export type RingItem = { src: string };

type Options = {
  onActiveChange: (index: number) => void;
  onOpen: (index: number) => void;
  /** Called once every texture has either loaded or failed. */
  onReady?: () => void;
  /** No auto-advance and no float: the ring only moves when asked. */
  reducedMotion?: boolean;
};

// World units. A work is PAINTING_HEIGHT tall; its width follows the photo.
const PAINTING_HEIGHT = 1.6;
const MAX_WIDTH = 1.9;
const GAP = 0.55;
const MIN_RADIUS = 2.2;

const AUTO_ADVANCE_MS = 5200;
// After the visitor touches the ring, it leaves them alone for this long.
const IDLE_AFTER_INPUT_MS = 9000;
const DRAG_SPEED = 0.0055; // radians per px
const FRICTION = 0.93;
const SNAP_EASE = 0.075;
const CLICK_SLOP_PX = 6;

const vertexShader = /* glsl */ `
  uniform float uBend;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;
    // A slight bow toward the viewer, as if the canvas were stretched on a
    // curved frame — it is what keeps flat planes from reading as cards.
    // The plane is a unit square here (scaled later), so x runs -0.5..0.5.
    p.z += uBend * (1.0 - 4.0 * p.x * p.x);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uLight;
  uniform float uOpacity;
  uniform float uReflection;
  uniform vec3 uBase;
  varying vec2 vUv;

  void main() {
    vec3 color = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : uBase;
    // Desaturate a little as the work falls into shade, so the active one
    // is the only one in full colour.
    float grey = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(grey), color, 0.35 + 0.65 * uLight) * (0.28 + 0.72 * uLight);

    float alpha = uOpacity;
    if (uReflection > 0.5) {
      // Mirrored copy under the work (flipped by a negative scale, so uv.y
      // is 0 at the seam): strongest there, gone a third of the way down.
      alpha *= (1.0 - smoothstep(0.0, 0.38, vUv.y)) * 0.22;
    }
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

type Slot = {
  group: Group;
  painting: Mesh<PlaneGeometry, ShaderMaterial>;
  reflection: Mesh<PlaneGeometry, ShaderMaterial>;
  frame: Mesh<PlaneGeometry, ShaderMaterial>;
  angle: number;
  width: number;
};

function makeMaterial(reflection: boolean) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    side: DoubleSide,
    depthWrite: !reflection,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uLight: { value: 1 },
      uOpacity: { value: 0 },
      uReflection: { value: reflection ? 1 : 0 },
      uBend: { value: 0.06 },
      uBase: { value: new Color('#3a3d33') },
    },
  });
}

// Shortest signed distance between two angles, in -π..π.
function wrapAngle(a: number) {
  const tau = Math.PI * 2;
  return ((((a + Math.PI) % tau) + tau) % tau) - Math.PI;
}

export class PaintingRingScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(32, 1, 0.1, 100);
  private ring = new Group();
  private slots: Slot[] = [];
  private textures: Texture[] = [];
  private raycaster = new Raycaster();
  private pointer = new Vector2();

  private step: number;
  private radius: number;
  private rotation = 0;
  private velocity = 0;
  private target: number | null = 0;
  private active = -1;

  private dragging = false;
  private dragStartX = 0;
  private lastX = 0;
  private moved = 0;
  private lastInput = -Infinity;
  private lastAdvance = performance.now();

  private frameId = 0;
  private visible = true;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private visibilityObserver: IntersectionObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    items: RingItem[],
    private options: Options,
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);

    const count = Math.max(items.length, 1);
    this.step = (Math.PI * 2) / count;
    // Big enough that neighbours never touch, small enough that a short
    // ring still curves visibly away from the camera.
    this.radius = Math.max(MIN_RADIUS, (count * (1.2 + GAP)) / (Math.PI * 2));

    this.scene.add(this.ring);
    this.buildSlots(items);
    this.loadTextures(items);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);

    // Off screen, nothing is drawn at all.
    this.visibilityObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.start();
    });
    this.visibilityObserver.observe(canvas);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.start();
  }

  // ---------- public API ----------

  goTo(index: number) {
    const n = this.slots.length;
    if (!n) return;
    // The ring is at rest when rotation = -angle; pick the copy of that
    // angle nearest to where it is now, so it always takes the short way.
    const desired = -index * this.step;
    this.target = this.rotation + wrapAngle(desired - this.rotation);
    this.velocity = 0;
    this.lastInput = performance.now();
  }

  next() {
    this.goTo(this.active + 1);
  }

  prev() {
    this.goTo(this.active - 1);
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointercancel', this.onPointerCancel);
    c.removeEventListener('pointerleave', this.onPointerLeave);
    document.removeEventListener('visibilitychange', this.onVisibility);

    for (const slot of this.slots) {
      for (const mesh of [slot.painting, slot.reflection, slot.frame]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    }
    for (const texture of this.textures) texture.dispose();
    this.renderer.dispose();
  }

  // ---------- setup ----------

  private buildSlots(items: RingItem[]) {
    items.forEach((_, index) => {
      const group = new Group();
      const angle = index * this.step;

      // Placeholder proportions until the photo tells us its own.
      const width = PAINTING_HEIGHT * 0.8;

      const painting = new Mesh(new PlaneGeometry(1, 1, 24, 1), makeMaterial(false));
      const reflection = new Mesh(new PlaneGeometry(1, 1, 24, 1), makeMaterial(true));

      // A thin dark margin behind the work, standing in for a frame edge.
      const frame = new Mesh(new PlaneGeometry(1, 1, 24, 1), makeMaterial(false));
      frame.material.uniforms.uBase.value = new Color('#15140f');
      frame.position.z = -0.012;

      group.add(frame, painting, reflection);
      group.userData.index = index;
      painting.userData.index = index;

      group.position.set(
        Math.sin(angle) * this.radius,
        0,
        Math.cos(angle) * this.radius,
      );
      group.rotation.y = angle;
      this.ring.add(group);

      const slot = { group, painting, reflection, frame, angle, width };
      this.sizeSlot(slot, width);
      this.slots.push(slot);
    });
  }

  private sizeSlot(slot: Slot, width: number) {
    slot.width = width;
    slot.painting.scale.set(width, PAINTING_HEIGHT, 1);
    slot.frame.scale.set(width + 0.06, PAINTING_HEIGHT + 0.06, 1);
    slot.reflection.scale.set(width, -PAINTING_HEIGHT, 1);
    slot.reflection.position.y = -PAINTING_HEIGHT - 0.06;
  }

  private loadTextures(items: RingItem[]) {
    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    let pending = items.length;

    const settle = () => {
      pending -= 1;
      if (pending === 0) this.options.onReady?.();
    };

    if (!pending) this.options.onReady?.();

    items.forEach((item, index) => {
      loader.load(
        item.src,
        (texture) => {
          if (this.disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = SRGBColorSpace;
          texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
          this.textures.push(texture);

          const image = texture.image as { width: number; height: number };
          const aspect = image.width / image.height || 0.8;
          const slot = this.slots[index];
          this.sizeSlot(slot, Math.min(PAINTING_HEIGHT * aspect, MAX_WIDTH));

          for (const mesh of [slot.painting, slot.reflection]) {
            mesh.material.uniforms.uMap.value = texture;
            mesh.material.uniforms.uHasMap.value = 1;
          }
          settle();
        },
        undefined,
        // A work whose photo fails stays as a dark panel rather than a hole
        // in the ring.
        settle,
      );
    });
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;

    // Pull the camera back on narrow screens so the active work and a sliver
    // of its neighbours always fit across.
    const fitWidth = MAX_WIDTH + 1.4;
    const fovH = 2 * Math.atan(Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.aspect);
    const distance = Math.max(4.4, fitWidth / 2 / Math.tan(fovH / 2) + 0.4);

    this.camera.position.set(0, 0.55, this.radius + distance);
    this.camera.lookAt(0, -0.15, this.radius - 1.5);
    this.camera.updateProjectionMatrix();
    this.render();
  }

  // ---------- loop ----------

  private start() {
    if (this.disposed || this.frameId || !this.visible || document.hidden) return;
    this.frameId = requestAnimationFrame(this.tick);
  }

  private tick = (time: number) => {
    this.frameId = 0;
    if (this.disposed) return;

    this.update(time);
    this.render();

    if (this.visible && !document.hidden) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private update(time: number) {
    const n = this.slots.length;
    if (!n) return;

    const now = performance.now();
    const idle = now - this.lastInput > IDLE_AFTER_INPUT_MS;

    if (
      !this.options.reducedMotion &&
      !this.dragging &&
      idle &&
      n > 1 &&
      now - this.lastAdvance > AUTO_ADVANCE_MS
    ) {
      this.lastAdvance = now;
      const desired = -(this.active + 1) * this.step;
      this.target = this.rotation + wrapAngle(desired - this.rotation);
    }

    if (!this.dragging) {
      if (this.target !== null) {
        this.rotation += (this.target - this.rotation) * SNAP_EASE;
        if (Math.abs(this.target - this.rotation) < 0.0004) {
          this.rotation = this.target;
          this.target = null;
        }
      } else if (Math.abs(this.velocity) > 0.0008) {
        this.rotation += this.velocity;
        this.velocity *= FRICTION;
      } else {
        // Momentum spent: settle on whichever work ended up nearest.
        this.velocity = 0;
        const nearest = Math.round(-this.rotation / this.step);
        this.target = -nearest * this.step;
        if (Math.abs(this.target - this.rotation) < 0.0004) this.target = null;
      }
    }

    this.ring.rotation.y = this.rotation;

    const t = time / 1000;
    for (const [index, slot] of this.slots.entries()) {
      // 1 facing the camera, 0 at a quarter turn or beyond.
      const offset = wrapAngle(slot.angle + this.rotation);
      const facing = Math.max(0, Math.cos(offset));
      const light = Math.pow(facing, 2.2);

      const float = this.options.reducedMotion ? 0 : Math.sin(t * 0.9 + index * 1.7) * 0.035;
      slot.group.position.y = float;
      const scale = 0.9 + 0.1 * light;
      slot.group.scale.setScalar(scale);

      const fadeIn = (m: Mesh<PlaneGeometry, ShaderMaterial>) => {
        const u = m.material.uniforms;
        u.uOpacity.value += (1 - u.uOpacity.value) * 0.06;
        u.uLight.value = light;
      };
      fadeIn(slot.painting);
      fadeIn(slot.reflection);
      fadeIn(slot.frame);
    }

    const active = ((Math.round(-this.rotation / this.step) % n) + n) % n;
    if (active !== this.active) {
      this.active = active;
      this.options.onActiveChange(active);
    }
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  // ---------- input ----------

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.dragging = true;
    this.dragStartX = this.lastX = event.clientX;
    this.moved = 0;
    this.velocity = 0;
    this.target = null;
    this.lastInput = performance.now();
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.dragging) {
      this.updateHover(event);
      return;
    }
    const dx = event.clientX - this.lastX;
    this.lastX = event.clientX;
    this.moved = Math.max(this.moved, Math.abs(event.clientX - this.dragStartX));
    this.rotation += dx * DRAG_SPEED;
    this.velocity = dx * DRAG_SPEED;
    this.lastInput = performance.now();
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    this.lastInput = performance.now();
    if (this.moved < CLICK_SLOP_PX) {
      this.velocity = 0;
      const index = this.pick(event);
      if (index === null) return;
      if (index === this.active) this.options.onOpen(index);
      else this.goTo(index);
    }
  };

  private onPointerCancel = () => {
    this.dragging = false;
  };

  private onPointerLeave = () => {
    this.canvas.style.cursor = '';
  };

  private onVisibility = () => {
    if (!document.hidden) this.start();
  };

  private updateHover(event: PointerEvent) {
    this.canvas.style.cursor = this.pick(event) === null ? 'grab' : 'pointer';
  }

  private pick(event: PointerEvent): number | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(
      this.slots.map((slot) => slot.painting),
      false,
    )[0];
    if (!hit) return null;
    // Only the half of the ring that faces the camera is clickable; the back
    // of it is in shade and reachable by turning the ring.
    const index = hit.object.userData.index as number;
    const offset = wrapAngle(this.slots[index].angle + this.rotation);
    return Math.cos(offset) > 0.2 ? index : null;
  }
}

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
