/*
  Silla de moto en 3D, modelada con código (sin archivo .glb que descargar).

  La forma sale del tipo de moto que elige el cliente (shapes.ts) y la malla
  de seat-geometry.ts. Al cambiar de moto, la silla se transforma en la nueva
  en medio segundo: todas las formas tienen los mismos vértices, así que basta
  con llevar cada uno de su lugar viejo al nuevo.

  Es una vista de referencia: la silla de cada cliente se hace a la medida.
*/
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildSeatGeometries, type SeatGeometries } from "./seat-geometry";
import { seatShape, type SeatShapeId } from "./shapes";
import {
  DIAMOND_TILE_M,
  GRAIN_TILE_M,
  SATIN_ANGLE,
  createContactShadow,
  loadEmbroideryFont,
  loadSeatTextures,
  paintDiamondColor,
  paintEmbroidery,
  type EmbroideryStyle,
  type EmbroideryTextures,
  type SeatPattern,
  type SeatTextures
} from "./textures";

export type SeatLook = {
  shape: SeatShapeId;
  center: string;
  sides: string;
  stitch: string;
  pattern: SeatPattern;
  /** Texto bordado en los dos costados; vacío, sin bordado. */
  embroidery: string;
  /** Color del hilo del bordado. */
  thread: string;
  embroideryStyle: EmbroideryStyle;
};

/** Vistas rápidas: tres cuartos (la de siempre), de lado y desde arriba. */
export type SeatView = "tres-cuartos" | "lado" | "arriba";

/** Dirección de la cámara vista desde arriba (rad), y su altura por defecto: unos 24°. */
const CAMERA_AZIMUTH = Math.atan2(0.62, 0.72);
const CAMERA_ELEVATION = Math.atan2(0.42, Math.hypot(0.62, 0.72));
const CAMERA_REACH = Math.hypot(0.62, 0.42, 0.72);

const VIEWS: Record<SeatView, { yaw: number; elevation: number }> = {
  // Giro de la silla y altura de la cámara. De lado, el costado derecho mira
  // de frente a la cámara (giro = dirección de la cámara).
  "tres-cuartos": { yaw: 0.42, elevation: CAMERA_ELEVATION },
  lado: { yaw: CAMERA_AZIMUTH, elevation: 0.1 },
  arriba: { yaw: CAMERA_AZIMUTH, elevation: 1.05 }
};
/** Duración del viaje de la cámara entre vistas, en ms. */
const VIEW_MS = 650;
/** Tras elegir una vista, la silla se queda quieta este tiempo antes de volver a girar sola. */
const VIEW_HOLD_MS = 6000;

export type SeatScene = {
  update(look: SeatLook): void;
  rotateBy(radians: number): void;
  /** Lleva la cámara a una vista guardada (de lado se lee el bordado). */
  setView(view: SeatView): void;
  dispose(): void;
};

export type SeatSceneOptions = {
  reducedMotion: boolean;
  /** Se llama una vez, cuando el primer cuadro ya está pintado. */
  onReady?: () => void;
  /** No se pudo preparar la silla (texturas o WebGL). */
  onError?: (error: unknown) => void;
};

const PIECES = ["center", "rightSide", "leftSide", "pan", "rightPiping", "leftPiping"] as const;
type Piece = (typeof PIECES)[number];

/** Duración de la transformación entre formas, en ms. */
const MORPH_MS = 560;

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function mountSeatScene(canvas: HTMLCanvasElement, initial: SeatLook, options: SeatSceneOptions): SeatScene {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  // Revisar errores de shader obliga al navegador a esperar la compilación
  // (casi un segundo en un teléfono modesto). Los shaders son de three.js.
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.4;

  const camera = new PerspectiveCamera(28, 1, 0.1, 20);

  // Luz de estudio: principal cálida arriba-adelante, contraluz fría para que
  // el borde de la silla se despegue del fondo negro, y un relleno suave.
  const key = new DirectionalLight(0xfff1e0, 2.6);
  key.position.set(1.6, 3, 2.2);
  const rim = new DirectionalLight(0xdfe8ff, 2.2);
  rim.position.set(-2.4, 1.4, -2.6);
  const rimLow = new DirectionalLight(0xffffff, 0.9);
  rimLow.position.set(2.6, 0.4, -2);
  scene.add(key, rim, rimLow, new HemisphereLight(0xffffff, 0x222222, 0.35));

  // Los mapas de relieve se calculan en un worker: hasta que lleguen no se
  // pinta nada (se sigue viendo la foto fija).
  let textures: SeatTextures | null = null;
  let compiled = false;
  let disposed = false;
  const toRepeat = (tileMeters: number) => new Vector2(1 / tileMeters, 1 / tileMeters);

  const leather = (color: string) =>
    new MeshPhysicalMaterial({
      color: new Color(color),
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.5,
      sheen: 0.25,
      sheenRoughness: 0.6,
      sheenColor: new Color(0x333333),
      normalScale: new Vector2(0.22, 0.22)
    });

  const centerMaterial = leather(initial.center);
  const sideMaterial = leather(initial.sides);
  // La franja mira hacia arriba, a la luz principal: con el brillo del cuero se
  // vería casi blanca. Mismo color que los costados, pero mate.
  const bandMaterial = leather(initial.sides);
  bandMaterial.roughness = 0.78;
  bandMaterial.clearcoat = 0;
  bandMaterial.sheen = 0;
  // Plástico negro con algo de brillo: el contraluz le marca el canto sobre el fondo negro.
  const panMaterial = new MeshStandardMaterial({ color: 0x171717, roughness: 0.42, metalness: 0 });
  const stitchMaterial = new MeshStandardMaterial({ color: new Color(initial.stitch), roughness: 0.62 });
  let diamondColor: CanvasTexture | null = null;
  // Hilo de bordado: satín brillante, con el brillo estirado a lo largo de
  // cada puntada (anisotropía). Las letras salen del alfa de la textura.
  const threadMaterial = new MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0,
    sheen: 0.6,
    sheenRoughness: 0.35,
    sheenColor: new Color(initial.thread),
    anisotropy: 0.6,
    // Dirección del hilo en la textura (perpendicular al avance del satín, con la v hacia arriba).
    anisotropyRotation: -(SATIN_ANGLE + Math.PI / 2),
    normalScale: new Vector2(1, 1),
    alphaTest: 0.5,
    alphaToCoverage: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const embroideryShadowMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  let embroideryTextures: EmbroideryTextures | null = null;
  let embroideryKey = "";

  /* ------------------------------------------------------------ Piezas */

  const seat = new Group();
  let current: SeatGeometries = buildSeatGeometries(seatShape(initial.shape));
  let shapeId = initial.shape;
  const materials: Record<Piece, MeshPhysicalMaterial | MeshStandardMaterial> = {
    center: centerMaterial,
    rightSide: sideMaterial,
    leftSide: sideMaterial,
    pan: panMaterial,
    rightPiping: sideMaterial,
    leftPiping: sideMaterial
  };
  const meshes = {} as Record<Piece, Mesh>;
  for (const piece of PIECES) {
    const mesh = new Mesh(current[piece], materials[piece]);
    // Durante la transformación los vértices se mueven: la esfera de
    // recorte guardada ya no sirve y la silla podría desaparecer.
    mesh.frustumCulled = false;
    meshes[piece] = mesh;
    seat.add(mesh);
  }

  const stitchShape = new CapsuleGeometry(0.0017, 0.0075, 3, 6);
  function makeStitches(matrices: Matrix4[]) {
    const mesh = new InstancedMesh(stitchShape, stitchMaterial, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }
  let stitches = makeStitches(current.stitches);
  seat.add(stitches);

  // Franja que cruza el asiento (Calle, Deportiva, Enduro), del color de los costados.
  const emptyGeometry = new BufferGeometry();
  const bandMesh = new Mesh(current.band ?? emptyGeometry, bandMaterial);
  bandMesh.visible = current.band !== null;
  bandMesh.frustumCulled = false;
  seat.add(bandMesh);

  // Marca bordada en los dos costados: hilo en relieve y su sombra sobre el cuero.
  const embroideryMeshes = {
    right: new Mesh(current.embroidery.right, threadMaterial),
    left: new Mesh(current.embroidery.left, threadMaterial),
    shadowRight: new Mesh(current.embroideryShadow.right, embroideryShadowMaterial),
    shadowLeft: new Mesh(current.embroideryShadow.left, embroideryShadowMaterial)
  };
  const embroideryGeometry = (geometries: SeatGeometries) => ({
    right: geometries.embroidery.right,
    left: geometries.embroidery.left,
    shadowRight: geometries.embroideryShadow.right,
    shadowLeft: geometries.embroideryShadow.left
  });
  for (const mesh of Object.values(embroideryMeshes)) {
    mesh.visible = false;
    mesh.frustumCulled = false;
    seat.add(mesh);
  }
  function showEmbroidery(show: boolean) {
    for (const mesh of Object.values(embroideryMeshes)) mesh.visible = show;
  }

  /**
   * Repinta el bordado cuando el cliente deja de escribir (pintarlo cuesta unas
   * decenas de ms en un teléfono: no debe frenar cada tecla). El primer
   * bordado y el de una forma nueva se pintan enseguida.
   */
  let embroideryTimer = 0;
  function requestEmbroidery(look: SeatLook) {
    window.clearTimeout(embroideryTimer);
    if (!embroideryTextures) {
      updateEmbroidery(look);
      return;
    }
    embroideryTimer = window.setTimeout(() => {
      updateEmbroidery(currentLook);
      needsRender = true;
      wake();
    }, 110);
  }

  /** Vuelve a pintar el bordado si cambió el texto, el hilo, la letra o el tamaño del parche. */
  function updateEmbroidery(look: SeatLook) {
    if (!textures || morph) return;
    window.clearTimeout(embroideryTimer);
    const { widthCm, heightCm } = current.embroidery;
    const key = [
      look.embroidery.trim(),
      look.thread,
      look.embroideryStyle,
      widthCm.toFixed(2),
      heightCm.toFixed(2)
    ].join("|");
    if (key !== embroideryKey) {
      embroideryKey = key;
      const painted = paintEmbroidery(look.embroidery, look.thread, look.embroideryStyle, widthCm, heightCm);
      embroideryTextures?.dispose();
      embroideryTextures = painted;
      if (painted) {
        const changed = threadMaterial.map === null;
        threadMaterial.map = painted.color;
        threadMaterial.normalMap = painted.normal;
        threadMaterial.sheenColor.set(look.thread);
        embroideryShadowMaterial.map = painted.shadow;
        if (changed) {
          threadMaterial.needsUpdate = true;
          embroideryShadowMaterial.needsUpdate = true;
        }
      }
    }
    showEmbroidery(embroideryTextures !== null);
  }

  // Sombra de contacto bajo la base; se estira con el largo de la silla.
  const shadowTexture = createContactShadow();
  const shadow = new Mesh(
    new PlaneGeometry(1, 0.7),
    new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.9 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  seat.add(shadow);

  const stage = new Group();
  stage.add(seat);
  scene.add(stage);

  // Largo y altura media que usa el encuadre (cambian durante la transformación).
  let seatLength = current.length;
  let seatMiddle = current.middle;
  shadow.scale.x = seatLength * 1.25;

  /* ---------------------------------------------- Cambio de forma */

  type Morph = {
    start: number;
    target: SeatGeometries;
    from: Record<Piece, { position: Float32Array; uv: Float32Array }>;
    fromLength: number;
    fromMiddle: number;
  };
  let morph: Morph | null = null;

  function attribute(geometry: BufferGeometry, name: "position" | "uv") {
    return geometry.getAttribute(name) as BufferAttribute;
  }

  /** Deja puestas las piezas de la forma nueva (sin animar o al terminar). */
  function settle(target: SeatGeometries) {
    for (const piece of PIECES) {
      // Se sueltan la copia animada (si la hubo) y la pieza de la forma vieja.
      const shown = meshes[piece].geometry;
      meshes[piece].geometry = target[piece];
      if (shown !== target[piece]) shown.dispose();
      if (current[piece] !== target[piece] && current[piece] !== shown) current[piece].dispose();
    }
    seat.remove(stitches);
    stitches.dispose();
    stitches = makeStitches(target.stitches);
    seat.add(stitches);
    if (bandMesh.geometry !== emptyGeometry && bandMesh.geometry !== target.band) bandMesh.geometry.dispose();
    bandMesh.geometry = target.band ?? emptyGeometry;
    bandMesh.visible = target.band !== null;
    const nextEmbroidery = embroideryGeometry(target);
    for (const name of Object.keys(embroideryMeshes) as Array<keyof typeof embroideryMeshes>) {
      const mesh = embroideryMeshes[name];
      if (mesh.geometry !== nextEmbroidery[name]) mesh.geometry.dispose();
      mesh.geometry = nextEmbroidery[name];
    }
    current = target;
    seatLength = target.length;
    seatMiddle = target.middle;
    shadow.scale.x = seatLength * 1.25;
    placeCamera();
    updateEmbroidery(currentLook);
  }

  function changeShape(id: SeatShapeId) {
    if (id === shapeId) return;
    shapeId = id;
    const target = buildSeatGeometries(seatShape(id));
    if (options.reducedMotion || !compiled) {
      if (morph) disposeGeometries(morph.target);
      morph = null;
      settle(target);
      return;
    }
    // Si ya se estaba transformando, sigue desde donde va.
    if (morph) disposeGeometries(morph.target);
    const from = {} as Morph["from"];
    for (const piece of PIECES) {
      const geometry = meshes[piece].geometry;
      from[piece] = {
        position: (attribute(geometry, "position").array as Float32Array).slice(),
        uv: (attribute(geometry, "uv").array as Float32Array).slice()
      };
    }
    // Las puntadas no se pueden transformar (cambia cuántas caben): se
    // esconden y vuelven con la forma nueva.
    stitches.visible = false;
    bandMesh.visible = false;
    showEmbroidery(false);
    morph = { start: performance.now(), target, from, fromLength: seatLength, fromMiddle: seatMiddle };
  }

  function stepMorph(now: number) {
    if (!morph) return;
    const t = Math.min(1, (now - morph.start) / MORPH_MS);
    const e = easeInOut(t);
    if (t >= 1) {
      // Las piezas que se animaron son copias; se cambian por las finales.
      const target = morph.target;
      morph = null;
      settle(target);
      return;
    }
    for (const piece of PIECES) {
      const geometry = meshes[piece].geometry;
      if (geometry === current[piece]) {
        // La primera vez se anima una copia: la geometría original queda
        // intacta por si hay que descartarla.
        meshes[piece].geometry = geometry.clone();
      }
      const animated = meshes[piece].geometry;
      for (const name of ["position", "uv"] as const) {
        const values = attribute(animated, name);
        const out = values.array as Float32Array;
        const a = morph.from[piece][name];
        const b = attribute(morph.target[piece], name).array as Float32Array;
        for (let i = 0; i < out.length; i++) out[i] = a[i] + (b[i] - a[i]) * e;
        values.needsUpdate = true;
      }
      animated.computeVertexNormals();
    }
    seatLength = morph.fromLength + (morph.target.length - morph.fromLength) * e;
    seatMiddle = morph.fromMiddle + (morph.target.middle - morph.fromMiddle) * e;
    shadow.scale.x = seatLength * 1.25;
    placeCamera();
  }

  function disposeGeometries(geometries: SeatGeometries) {
    for (const piece of PIECES) geometries[piece].dispose();
    geometries.band?.dispose();
    for (const geometry of Object.values(embroideryGeometry(geometries))) geometry.dispose();
  }

  /* ------------------------------------------------------------ Look */

  let currentLook = initial;
  function applyLook(look: SeatLook) {
    currentLook = look;
    changeShape(look.shape);
    if (!textures) return;
    sideMaterial.color.set(look.sides);
    bandMaterial.color.set(look.sides);
    stitchMaterial.color.set(look.stitch);
    if (look.pattern === "rombos") {
      diamondColor = paintDiamondColor(diamondColor, look.center, look.stitch);
      diamondColor.repeat.copy(toRepeat(DIAMOND_TILE_M));
      centerMaterial.map = diamondColor;
      centerMaterial.color.set(0xffffff);
      centerMaterial.normalMap = textures.diamondNormal;
      centerMaterial.normalScale.set(0.8, 0.8);
      centerMaterial.roughness = 0.52;
    } else if (look.pattern === "antideslizante") {
      centerMaterial.map = null;
      centerMaterial.color.set(look.center);
      centerMaterial.normalMap = textures.gripNormal;
      centerMaterial.normalScale.set(0.9, 0.9);
      centerMaterial.roughness = 0.82;
    } else {
      centerMaterial.map = null;
      centerMaterial.color.set(look.center);
      centerMaterial.normalMap = textures.grainNormal;
      centerMaterial.normalScale.set(0.22, 0.22);
      centerMaterial.roughness = 0.55;
    }
    centerMaterial.needsUpdate = true;
    requestEmbroidery(look);
  }

  // La letra del bordado es la de la página: se espera a que esté lista.
  Promise.all([loadSeatTextures(), loadEmbroideryFont()])
    .then(([loaded]) => {
      if (disposed) {
        loaded.dispose();
        return;
      }
      textures = loaded;
      textures.grainNormal.repeat.copy(toRepeat(GRAIN_TILE_M));
      textures.diamondNormal.repeat.copy(toRepeat(DIAMOND_TILE_M));
      textures.gripNormal.repeat.copy(toRepeat(DIAMOND_TILE_M));
      sideMaterial.normalMap = textures.grainNormal;
      sideMaterial.needsUpdate = true;
      bandMaterial.normalMap = textures.grainNormal;
      bandMaterial.needsUpdate = true;
      applyLook(currentLook);
      // Compila los shaders sin bloquear la página (KHR_parallel_shader_compile)
      // antes del primer cuadro; mientras tanto se sigue viendo la foto fija.
      return renderer.compileAsync(scene, camera).then(() => {
        if (disposed) return;
        compiled = true;
        needsRender = true;
        wake();
      });
    })
    .catch((error: unknown) => options.onError?.(error));

  /* ------------------------------------------------ Tamaño y encuadre */

  let elevation = CAMERA_ELEVATION;

  function placeCamera() {
    // Encuadre: la silla ocupa ~85 % del ancho disponible, sea del largo que sea.
    const span = seatLength * 1.1;
    const fit = Math.max(span, span / Math.min(1.35, camera.aspect));
    const distance = fit / (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(0.75, Math.min(1.6, camera.aspect));
    // Cámara baja (unos 24°): se lee el perfil, que es lo que cambia de una moto a otra.
    // Desde arriba la punta queda más cerca de la cámara: se aleja un poco para que quepa.
    const reach = distance * CAMERA_REACH * (1 + 0.22 * Math.max(0, elevation - CAMERA_ELEVATION));
    camera.position.set(
      reach * Math.cos(elevation) * Math.sin(CAMERA_AZIMUTH),
      reach * Math.sin(elevation),
      reach * Math.cos(elevation) * Math.cos(CAMERA_AZIMUTH)
    );
    camera.lookAt(0, seatMiddle, 0);
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  function frame() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const narrow = width < 640;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.75 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    placeCamera();
  }

  /* ------------------------------------------------------- Movimiento */

  // Tres cuartos: el costado y el asiento a la vez, la punta hacia la derecha.
  let yaw = 0.42;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  let lastTime = 0;
  let lastInteraction = -Infinity;
  let visible = true;
  let needsRender = true;
  let raf = 0;
  let previous = performance.now();
  let readyFired = false;
  let viewTween: { start: number; fromYaw: number; toYaw: number; fromElevation: number; toElevation: number } | null =
    null;

  function stepView(now: number) {
    if (!viewTween) return false;
    const t = Math.min(1, (now - viewTween.start) / VIEW_MS);
    const e = easeInOut(t);
    yaw = viewTween.fromYaw + (viewTween.toYaw - viewTween.fromYaw) * e;
    elevation = viewTween.fromElevation + (viewTween.toElevation - viewTween.fromElevation) * e;
    placeCamera();
    if (t >= 1) viewTween = null;
    lastInteraction = now + VIEW_HOLD_MS - 2600;
    return true;
  }

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    viewTween = null;
    lastX = event.clientX;
    lastTime = event.timeStamp;
    velocity = 0;
    lastInteraction = performance.now();
    canvas.setPointerCapture(event.pointerId);
    wake();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dt = Math.max(1, event.timeStamp - lastTime) / 1000;
    const delta = dx * 0.0085;
    yaw += delta;
    velocity = delta / dt;
    lastX = event.clientX;
    lastTime = event.timeStamp;
    lastInteraction = performance.now();
    needsRender = true;
  };
  const onPointerUp = (event: PointerEvent) => {
    dragging = false;
    lastInteraction = performance.now();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    wake();
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  // Cambiar el tamaño borra el lienzo: hay que volver a pintar enseguida.
  const resizeObserver = new ResizeObserver(() => {
    frame();
    wake();
  });
  resizeObserver.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  });
  intersection.observe(canvas);
  const onVisibility = () => {
    if (!document.hidden) wake();
  };
  document.addEventListener("visibilitychange", onVisibility);

  function tick(now: number) {
    raf = 0;
    if (!compiled) return;
    const dt = Math.min(1 / 30, (now - previous) / 1000);
    previous = now;
    let moving = morph !== null;
    stepMorph(now);
    if (stepView(now)) moving = true;
    else if (!dragging) {
      if (Math.abs(velocity) > 0.01) {
        yaw += velocity * dt;
        velocity *= Math.exp(-4 * dt);
        moving = true;
      } else if (!options.reducedMotion && now - lastInteraction > 2600) {
        // Turntable lento mientras nadie la toca.
        yaw += dt * 0.32;
        moving = true;
      }
    }
    stage.rotation.y = yaw;
    if (moving || needsRender || dragging) {
      renderer.render(scene, camera);
      needsRender = false;
      if (!readyFired) {
        readyFired = true;
        options.onReady?.();
      }
    }
    if ((moving || dragging) && visible && !document.hidden) raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (raf || !visible || document.hidden) {
      if (!raf && needsRender) raf = requestAnimationFrame(tick);
      return;
    }
    previous = performance.now();
    raf = requestAnimationFrame(tick);
  }

  frame();
  wake();

  return {
    update(look) {
      applyLook(look);
      needsRender = true;
      wake();
    },
    setView(view) {
      const target = VIEWS[view];
      // El camino corto: nunca más de media vuelta.
      const turn = target.yaw - yaw;
      const toYaw = yaw + Math.atan2(Math.sin(turn), Math.cos(turn));
      velocity = 0;
      if (options.reducedMotion) {
        yaw = toYaw;
        elevation = target.elevation;
        placeCamera();
        lastInteraction = performance.now() + VIEW_HOLD_MS;
      } else {
        viewTween = {
          start: performance.now(),
          fromYaw: yaw,
          toYaw,
          fromElevation: elevation,
          toElevation: target.elevation
        };
      }
      needsRender = true;
      wake();
    },
    rotateBy(radians) {
      viewTween = null;
      yaw += radians;
      lastInteraction = performance.now();
      needsRender = true;
      wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(embroideryTimer);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      if (morph) disposeGeometries(morph.target);
      for (const piece of PIECES) {
        meshes[piece].geometry.dispose();
        current[piece].dispose();
      }
      stitches.dispose();
      stitchShape.dispose();
      bandMesh.geometry.dispose();
      emptyGeometry.dispose();
      for (const mesh of Object.values(embroideryMeshes)) mesh.geometry.dispose();
      embroideryTextures?.dispose();
      shadow.geometry.dispose();
      [
        centerMaterial,
        sideMaterial,
        bandMaterial,
        panMaterial,
        stitchMaterial,
        threadMaterial,
        embroideryShadowMaterial,
        shadow.material
      ].forEach((material) =>
        material.dispose()
      );
      diamondColor?.dispose();
      shadowTexture.dispose();
      textures?.dispose();
      environment.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
    }
  };
}
