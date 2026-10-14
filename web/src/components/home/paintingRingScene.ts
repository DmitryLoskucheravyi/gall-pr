import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SpotLight,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  WebGLRenderer,
  type Texture,
} from 'three';

// The featured works hung on a slow carousel ring, rendered with three.js as a
// room rather than as a carousel of pictures.
//
// Plain module, no React: it is imported dynamically by PaintingShowcase only
// once the section is about to scroll into view, so three.js never weighs on
// the first screen of the homepage. Everything it creates is released in
// destroy() — the homepage is navigated away from and back to constantly.
//
// What makes it read as a room and not as a slideshow:
//
//   * every work is a canvas on a stretcher — a box with real depth, so the
//     ones turned away show their edge and their raw linen side;
//   * one picture light hangs in front, as in a gallery. Nothing paints the
//     works lighter or darker by hand any more: a work falls into shade
//     because it has turned away from the lamp, and that is all;
//   * it casts real shadows onto a floor that catches the lamp's sheen and
//     holds the works' reflections;
//   * the artwork's own luminance drives a bump map, so the paint has relief
//     and the raking light finds it — the single biggest difference between
//     "a photo on a plane" and "a painting";
//   * dust hangs in the lamp's beam, and the far side of the ring dissolves
//     into the room's own darkness.
//
// The section's backdrop is a fixed near-black in both themes (see
// PaintingShowcase.module.scss), which is what lets the room have a floor and
// a fog colour at all — they are matched to it, so the canvas has no visible
// edge.

export type RingItem = { src: string };

type Options = {
  onActiveChange: (index: number) => void;
  onOpen: (index: number) => void;
  /** Called once every texture has either loaded or failed. */
  onReady?: () => void;
  /** No auto-advance, no float, no parallax: it only moves when asked. */
  reducedMotion?: boolean;
};

// World units. A work is PAINTING_HEIGHT tall; its width follows the photo.
const PAINTING_HEIGHT = 1.6;
const MAX_WIDTH = 1.9;
const GAP = 0.55;
const MIN_RADIUS = 2.2;

// Depth of the stretcher the canvas is wrapped around, and how far the works
// hang above the floor — the gap is what gives the reflection a seam to start
// from.
const CANVAS_DEPTH = 0.055;
const FLOOR_GAP = 0.1;
const FLOOR_Y = -PAINTING_HEIGHT / 2 - FLOOR_GAP;

// The room, matched to $room in PaintingShowcase.module.scss so that fogged
// geometry and the floor's fade-out meet the backdrop invisibly.
const ROOM_COLOR = 0x12120f;
const LAMP_COLOR = 0xffeccd;
const LINEN_COLOR = 0xa89e89;
const STRETCHER_COLOR = 0x4a4336;

const AUTO_ADVANCE_MS = 5200;
// After the visitor touches the ring, it leaves them alone for this long.
const IDLE_AFTER_INPUT_MS = 9000;
const DRAG_SPEED = 0.0055; // radians per px
const FRICTION = 0.93;
const SNAP_EASE = 0.075;
const CLICK_SLOP_PX = 6;

// How far the work at the front steps out of the ring, and how far the camera
// drifts with the pointer. Both small on purpose: the depth should be felt
// rather than noticed.
const FRONT_STEP = 0.14;
const PARALLAX_X = 0.42;
const PARALLAX_Y = 0.2;
const PARALLAX_EASE = 0.045;

// The reflection is a mirrored copy of the work, unlit: a dimmed image with a
// vertical fade is what a polished floor returns, and shading it for real
// would cost a second pass to see something this faint.
const mirrorVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const mirrorFragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uStrength;
  uniform vec3 uBase;
  varying vec2 vUv;

  void main() {
    vec3 color = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : uBase;
    // Flipped by a negative scale, so uv.y is 0 at the seam with the floor:
    // strongest there, gone a third of the way down.
    float fade = 1.0 - smoothstep(0.0, 0.34, vUv.y);
    gl_FragColor = vec4(color * 0.45, fade * uStrength);
    #include <colorspace_fragment>
  }
`;

type Slot = {
  group: Group;
  /** The canvas on its stretcher — the work itself, and the only pick target. */
  canvas: Mesh<BoxGeometry, MeshStandardMaterial[]>;
  mirror: Mesh<PlaneGeometry, ShaderMaterial>;
  face: MeshStandardMaterial;
  angle: number;
  width: number;
};

// Shortest signed distance between two angles, in -π..π.
function wrapAngle(a: number) {
  const tau = Math.PI * 2;
  return ((((a + Math.PI) % tau) + tau) % tau) - Math.PI;
}

// A square of canvas weave, drawn once and tiled over every work as its
// roughness map: the varnish catches the lamp unevenly along the threads
// instead of returning one flat sheen across the whole surface.
function makeWeaveTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(0, 0, size, size);

  // Warp and weft, a couple of pixels apart, each with its own slight
  // variation so the weave never lines up into a visible grid.
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 3) {
    const warp = 148 + Math.round(Math.random() * 26);
    ctx.strokeStyle = `rgb(${warp},${warp},${warp})`;
    ctx.beginPath();
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, size);
    ctx.stroke();

    const weft = 120 + Math.round(Math.random() * 26);
    ctx.strokeStyle = `rgb(${weft},${weft},${weft})`;
    ctx.beginPath();
    ctx.moveTo(0, i + 1.5);
    ctx.lineTo(size, i + 1.5);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  // Tiled in roughly world units for a canvas of the usual size, rather than
  // per work: a copy of the weave for every slot would buy a difference in
  // thread count nobody could see.
  texture.repeat.set(9, 12);
  return texture;
}

// The floor is only there where the lamp reaches it. Past that it fades out
// into the section's own backdrop, so a plane big enough to take the shadows
// never shows an edge.
function makeFloorFadeTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.42, '#d8d8d8');
  gradient.addColorStop(0.78, '#2a2a2a');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new CanvasTexture(canvas);
}

// A soft round speck for the dust. A square point would read as a pixel.
function makeMoteTexture() {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new CanvasTexture(canvas);
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

  // The room.
  private floor: Mesh<PlaneGeometry, MeshStandardMaterial>;
  private motes: Points<BufferGeometry, PointsMaterial> | null = null;
  private moteDrift: Float32Array | null = null;
  private weave: Texture | null;
  private floorFade: Texture | null;
  private moteSprite: Texture | null;

  // Shared by every work: the linen edge of the stretcher and its back.
  private edgeMaterial: MeshStandardMaterial;
  private backMaterial: MeshStandardMaterial;

  private step: number;
  private radius: number;
  private fogFar = Infinity;
  private rotation = 0;
  private velocity = 0;
  private target: number | null = 0;
  private active = -1;

  // Where the camera sits when the pointer is still, and where it is being
  // pulled to.
  private cameraBase = { x: 0, y: 0.55, z: 0 };
  private cameraLook = { y: -0.15, z: 0 };
  private parallax = { x: 0, y: 0 };
  private parallaxTo = { x: 0, y: 0 };

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
    // A phone renders this at the same size as a laptop but with three times
    // the pixels and a fraction of the fill rate, and the room has a shadow
    // pass on top of the colour one now.
    const compact = window.innerWidth < 768;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.6 : 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    // Physical lighting blows out to white without it: the lamp is bright
    // enough to matter, and a filmic curve is what keeps a lit canvas from
    // clipping while the shaded ones still hold their detail.
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    const count = Math.max(items.length, 1);
    this.step = (Math.PI * 2) / count;
    // Big enough that neighbours never touch, small enough that a short
    // ring still curves visibly away from the camera.
    this.radius = Math.max(MIN_RADIUS, (count * (1.2 + GAP)) / (Math.PI * 2));

    this.weave = makeWeaveTexture();
    this.floorFade = makeFloorFadeTexture();
    this.moteSprite = makeMoteTexture();

    // Both are plain matter: raw linen on the sides of the stretcher, bare
    // wood behind it. Shared by every work — they carry no texture of their
    // own, so one of each is enough for the whole ring.
    this.edgeMaterial = new MeshStandardMaterial({
      color: new Color(LINEN_COLOR),
      roughness: 0.92,
      metalness: 0,
    });
    this.backMaterial = new MeshStandardMaterial({
      color: new Color(STRETCHER_COLOR),
      roughness: 0.85,
      metalness: 0,
    });

    this.scene.add(this.ring);
    this.buildRoom(compact);
    this.buildLamp(compact);
    this.floor = this.buildFloor();
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
      slot.canvas.geometry.dispose();
      slot.face.dispose();
      slot.mirror.geometry.dispose();
      slot.mirror.material.dispose();
    }
    this.edgeMaterial.dispose();
    this.backMaterial.dispose();

    this.floor.geometry.dispose();
    this.floor.material.dispose();
    this.motes?.geometry.dispose();
    this.motes?.material.dispose();

    for (const texture of this.textures) texture.dispose();
    this.weave?.dispose();
    this.floorFade?.dispose();
    this.moteSprite?.dispose();

    this.renderer.dispose();
  }

  // ---------- the room ----------

  private buildRoom(compact: boolean) {
    // The far side of the ring walks off into the room's own darkness rather
    // than hanging there at full strength — the cheapest depth cue there is,
    // and the fog colour is the backdrop's, so nothing shows a seam.
    // Tuned in resize(), once the camera's distance is known.
    this.scene.fog = new Fog(ROOM_COLOR, this.radius, this.radius * 3);

    // Enough to keep the works that have turned away from the lamp as objects
    // in a dark room rather than as holes in the page.
    this.scene.add(new AmbientLight(0xb8c3a8, 0.22));

    // A cool rim from behind and to one side: it is what draws the edge of
    // the stretcher on the works along the sides of the ring.
    const rim = new DirectionalLight(0x9fb48b, 0.45);
    rim.position.set(-4, 2.4, -this.radius);
    this.scene.add(rim);

    // Warm bounce back off the floor, which is what stops the bottom of each
    // canvas from going flat black.
    const bounce = new DirectionalLight(0xffd9a8, 0.22);
    bounce.position.set(0, FLOOR_Y - 1, this.radius + 2);
    this.scene.add(bounce);

    // There was image-based lighting here — a RoomEnvironment convolved into
    // a cubemap by PMREMGenerator, for a little specular on the varnish and
    // the linen. It is gone, and the reason is worth keeping.
    //
    // Generating it renders a scene into a render target and convolves it,
    // all on the main thread, in one go. This scene is built while the reader
    // is still scrolling the hero — the section preloads before it is in view
    // — and that showed up as an 833ms frame in the middle of the scroll.
    // Measured at the scroll position where this constructor runs.
    //
    // What it bought was subtle on matte paint lit by a spotlight from the
    // front. What it cost was the worst stutter on the page.

    this.buildMotes(compact);
  }

  // The gallery's picture light: fixed in front of the ring, pointed at the
  // work that happens to be facing the camera. It never follows anything —
  // the ring turns through its beam, and that alone is what lights the active
  // work and lets the others fall into shade.
  private buildLamp(compact: boolean) {
    const lamp = new SpotLight(LAMP_COLOR, 55, 14, 0.46, 0.85, 1.7);
    lamp.position.set(0.4, 2.7, this.radius + 1.9);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(compact ? 512 : 1024, compact ? 512 : 1024);
    lamp.shadow.camera.near = 0.6;
    lamp.shadow.camera.far = 10;
    lamp.shadow.radius = 3;
    // Without it the works shadow themselves in thin stripes — the classic
    // acne on a surface that both casts and receives.
    lamp.shadow.bias = -0.0015;
    lamp.shadow.normalBias = 0.02;

    // A spotlight aims at its target object, which has to be in the scene
    // for its world position to be resolved.
    const target = new Object3D();
    target.position.set(0, -0.1, this.radius);
    this.scene.add(target);
    lamp.target = target;
    this.scene.add(lamp);
  }

  private buildFloor() {
    const floor = new Mesh(
      new PlaneGeometry(26, 26),
      new MeshStandardMaterial({
        color: new Color(ROOM_COLOR),
        roughness: 0.5,
        metalness: 0.14,
        transparent: true,
        alphaMap: this.floorFade ?? undefined,
        // The reflections live below the floor plane, so a floor that wrote
        // depth would occlude every one of them. It still tests depth, which
        // is what keeps it from washing over the works in front of it.
        depthWrite: false,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    // Under the reflections, which are transparent too and must not be
    // depth-sorted behind the surface they sit on.
    floor.renderOrder = 0;
    this.scene.add(floor);
    return floor;
  }

  private buildMotes(compact: boolean) {
    const count = compact ? 90 : 180;
    const positions = new Float32Array(count * 3);
    const drift = new Float32Array(count * 2);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 1] = FLOOR_Y + Math.random() * 3.2;
      positions[i * 3 + 2] = this.radius - 2.2 + Math.random() * 4.4;
      // Each speck rises at its own pace and sways on its own phase.
      drift[i * 2] = 0.04 + Math.random() * 0.1;
      drift[i * 2 + 1] = Math.random() * Math.PI * 2;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const motes = new Points(
      geometry,
      new PointsMaterial({
        color: 0xffeccd,
        size: 0.03,
        sizeAttenuation: true,
        map: this.moteSprite ?? undefined,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    );
    motes.renderOrder = 2;
    this.scene.add(motes);

    this.motes = motes;
    this.moteDrift = drift;
  }

  // ---------- the works ----------

  private buildSlots(items: RingItem[]) {
    items.forEach((_, index) => {
      const group = new Group();
      const angle = index * this.step;

      // Placeholder proportions until the photo tells us its own.
      const width = PAINTING_HEIGHT * 0.8;

      // The paint itself. roughness is 1 so the weave map is what decides the
      // sheen, and opacity ramps up from nothing as the photo arrives.
      const face = new MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1,
        roughnessMap: this.weave ?? undefined,
        metalness: 0,
      });

      // A box, not a plane: the ring turns, and what sells a work as an object
      // is seeing the side of its stretcher as it goes.
      const canvasMesh = new Mesh(new BoxGeometry(1, 1, CANVAS_DEPTH), [
        this.edgeMaterial,
        this.edgeMaterial,
        this.edgeMaterial,
        this.edgeMaterial,
        face,
        this.backMaterial,
      ]);
      canvasMesh.castShadow = true;
      canvasMesh.userData.index = index;

      const mirror = new Mesh(
        new PlaneGeometry(1, 1),
        new ShaderMaterial({
          vertexShader: mirrorVertexShader,
          fragmentShader: mirrorFragmentShader,
          transparent: true,
          depthWrite: false,
          uniforms: {
            uMap: { value: null },
            uHasMap: { value: 0 },
            uStrength: { value: 0 },
            uBase: { value: new Color(0x3a3d33) },
          },
        }),
      );
      mirror.renderOrder = 1;

      group.add(canvasMesh, mirror);
      group.userData.index = index;

      group.position.set(
        Math.sin(angle) * this.radius,
        0,
        Math.cos(angle) * this.radius,
      );
      group.rotation.y = angle;
      this.ring.add(group);

      const slot: Slot = {
        group,
        canvas: canvasMesh,
        mirror,
        face,
        angle,
        width,
      };
      this.sizeSlot(slot, width);
      this.slots.push(slot);
    });
  }

  private sizeSlot(slot: Slot, width: number) {
    slot.width = width;
    // The box is a unit square CANVAS_DEPTH thick, so scaling x and y alone
    // keeps the stretcher's depth the same on every work.
    slot.canvas.scale.set(width, PAINTING_HEIGHT, 1);
    slot.mirror.scale.set(width, -PAINTING_HEIGHT, 1);
    // The work's reflection across the floor plane. Reset every frame too,
    // because the float has to be mirrored along with it — see update().
    slot.mirror.position.y = 2 * FLOOR_Y;
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

          slot.face.map = texture;
          // The painting's own luminance as relief. It is not what the artist
          // laid down stroke for stroke, but it rises where the paint is
          // thick and that is enough for the lamp to find an edge to catch —
          // which is the whole difference between a canvas and a print.
          slot.face.bumpMap = texture;
          slot.face.bumpScale = 0.4;
          slot.face.needsUpdate = true;

          const uniforms = slot.mirror.material.uniforms;
          uniforms.uMap.value = texture;
          uniforms.uHasMap.value = 1;

          settle();
        },
        undefined,
        // A work whose photo fails stays as a blank canvas rather than a hole
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
    // of its neighbours always fit across. On a portrait phone the margin is
    // much tighter: the neighbours only peek in, and the work itself gets
    // the width.
    const fitWidth = MAX_WIDTH + (this.camera.aspect < 1 ? 0.45 : 1.4);
    const fovH = 2 * Math.atan(Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.aspect);
    const distance = Math.max(4.4, fitWidth / 2 / Math.tan(fovH / 2) + 0.4);

    this.cameraBase = { x: 0, y: 0.55, z: this.radius + distance };
    this.cameraLook = { y: -0.15, z: this.radius - 1.5 };

    // Measured from the camera, not from the middle of the ring: the work at
    // the front stays clear of the fog, the ones along the sides are well
    // into it, and the far side is gone before it gets there.
    const fog = this.scene.fog as Fog;
    fog.near = distance + this.radius * 0.2;
    fog.far = distance + this.radius * 1.35;
    this.fogFar = fog.far;
    this.applyCamera();
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private applyCamera() {
    this.camera.position.set(
      this.cameraBase.x + this.parallax.x,
      this.cameraBase.y + this.parallax.y,
      this.cameraBase.z,
    );
    this.camera.lookAt(0, this.cameraLook.y, this.cameraLook.z);
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
      const front = Math.pow(facing, 2.2);

      const float = this.options.reducedMotion
        ? 0
        : Math.sin(t * 0.9 + index * 1.7) * 0.035;

      // Past the end of the fog there is nothing left of a work but a
      // silhouette in the fog's own colour, which the section's backdrop is
      // lighter than. Drop it instead, and save the draw while at it.
      const worldAngle = slot.angle + this.rotation;
      const dx = Math.sin(worldAngle) * this.radius - this.camera.position.x;
      const dz = Math.cos(worldAngle) * this.radius - this.camera.position.z;
      const visible = Math.sqrt(dx * dx + dz * dz) < this.fogFar;
      slot.group.visible = visible;
      if (!visible) continue;

      // The work at the front steps out of the ring towards the viewer, which
      // is also what walks it into the brightest part of the lamp's beam.
      const radius = this.radius + FRONT_STEP * front;
      slot.group.position.set(
        Math.sin(slot.angle) * radius,
        float,
        Math.cos(slot.angle) * radius,
      );
      slot.group.scale.setScalar(0.92 + 0.08 * front);

      // The floor returns the work from as far below it as the work is above:
      // the float has to be mirrored, not carried along.
      slot.mirror.position.y = 2 * FLOOR_Y - 2 * float;

      // Nothing here decides how lit a work is any more — the lamp does. The
      // one thing left is the reflection, which is kept to the works the
      // floor could plausibly be returning.
      slot.mirror.material.uniforms.uStrength.value = front * 0.42;
    }

    if (!this.options.reducedMotion) {
      this.parallax.x += (this.parallaxTo.x - this.parallax.x) * PARALLAX_EASE;
      this.parallax.y += (this.parallaxTo.y - this.parallax.y) * PARALLAX_EASE;
      this.applyCamera();
    }

    this.driftMotes(t);

    const active = ((Math.round(-this.rotation / this.step) % n) + n) % n;
    if (active !== this.active) {
      this.active = active;
      this.options.onActiveChange(active);
    }
  }

  private driftMotes(t: number) {
    const motes = this.motes;
    const drift = this.moteDrift;
    if (!motes || !drift || this.options.reducedMotion) return;

    const attribute = motes.geometry.getAttribute('position');
    const array = attribute.array as Float32Array;
    const ceiling = FLOOR_Y + 3.2;

    for (let i = 0; i < array.length / 3; i += 1) {
      const rise = drift[i * 2];
      const phase = drift[i * 2 + 1];
      array[i * 3 + 1] += rise * 0.004;
      if (array[i * 3 + 1] > ceiling) array[i * 3 + 1] = FLOOR_Y;
      // A sway rather than a line: dust in a room has no straight path up.
      array[i * 3] += Math.sin(t * 0.4 + phase) * 0.0006;
    }
    attribute.needsUpdate = true;
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
    this.trackParallax(event);

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
    // Back to the straight-on view, rather than leaving the room leaning the
    // way the pointer last went.
    this.parallaxTo.x = 0;
    this.parallaxTo.y = 0;
  };

  private onVisibility = () => {
    if (!document.hidden) this.start();
  };

  // The room leans a little with the pointer. It is the strongest depth cue
  // in the whole scene for the cheapest price: parallax between the works at
  // the front and the ones behind them.
  private trackParallax(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    const rect = this.canvas.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    this.parallaxTo.x = nx * PARALLAX_X;
    this.parallaxTo.y = -ny * PARALLAX_Y;
  }

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
      this.slots.map((slot) => slot.canvas),
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
