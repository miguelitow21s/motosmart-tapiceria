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
  createContactShadow,
  loadSeatTextures,
  paintDiamondColor,
  type SeatPattern,
  type SeatTextures
} from "./textures";

export type SeatLook = {
  shape: SeatShapeId;
  center: string;
  sides: string;
  stitch: string;
  pattern: SeatPattern;
};

export type SeatScene = {
  update(look: SeatLook): void;
  rotateBy(radians: number): void;
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
  // Plástico negro con algo de brillo: el contraluz le marca el canto sobre el fondo negro.
  const panMaterial = new MeshStandardMaterial({ color: 0x171717, roughness: 0.42, metalness: 0 });
  const stitchMaterial = new MeshStandardMaterial({ color: new Color(initial.stitch), roughness: 0.62 });
  let diamondColor: CanvasTexture | null = null;

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
    current = target;
    seatLength = target.length;
    seatMiddle = target.middle;
    shadow.scale.x = seatLength * 1.25;
    placeCamera();
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
  }

  /* ------------------------------------------------------------ Look */

  let currentLook = initial;
  function applyLook(look: SeatLook) {
    currentLook = look;
    changeShape(look.shape);
    if (!textures) return;
    sideMaterial.color.set(look.sides);
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
  }

  loadSeatTextures()
    .then((loaded) => {
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

  function placeCamera() {
    // Encuadre: la silla ocupa ~85 % del ancho disponible, sea del largo que sea.
    const span = seatLength * 1.1;
    const fit = Math.max(span, span / Math.min(1.35, camera.aspect));
    const distance = fit / (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(0.75, Math.min(1.6, camera.aspect));
    // Cámara baja (unos 25°): se lee el perfil, que es lo que cambia de una moto a otra.
    camera.position.set(distance * 0.62, distance * 0.42, distance * 0.72);
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

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
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
    if (!dragging) {
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
    rotateBy(radians) {
      yaw += radians;
      lastInteraction = performance.now();
      needsRender = true;
      wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
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
      shadow.geometry.dispose();
      [centerMaterial, sideMaterial, panMaterial, stitchMaterial, shadow.material].forEach((material) =>
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
