/*
  Silla de moto en 3D, modelada con código (sin archivo .glb que descargar).

  La silla es un "loft": a lo largo del eje X (de la cola, x<0, a la punta que
  va contra el tanque, x>0) se barre una sección transversal tipo superelipse
  cuyo ancho y alto cambian con perfiles medidos de una silla de calle común
  (unos 68 cm de largo, 41 cm en lo más ancho). La sección se reparte en tres
  piezas, como se corta el cuero en el taller: el panel central (el asiento),
  los costados y la base plástica. Entre centro y costados va un vivo (piping)
  y una doble costura de puntadas de verdad, cada una una pieza 3D.

  Es una vista de referencia: la silla de cada cliente se hace a la medida.
*/
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CatmullRomCurve3,
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
  Quaternion,
  Scene,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  DIAMOND_TILE_M,
  GRAIN_TILE_M,
  createContactShadow,
  createSeatTextures,
  paintDiamondColor,
  type SeatPattern
} from "./textures";

export type SeatLook = {
  center: string;
  sides: string;
  stitch: string;
  pattern: SeatPattern;
};

/* ---------------------------------------------------------------- Forma */

type Point = [number, number];

/** Curva suave que pasa por los puntos (Hermite cúbica con tangentes de vecinos). */
function profile(points: Point[]) {
  const n = points.length;
  const slope = (k: number) => {
    const a = points[Math.max(0, k - 1)];
    const b = points[Math.min(n - 1, k + 1)];
    return (b[1] - a[1]) / (b[0] - a[0]);
  };
  return (u: number) => {
    if (u <= points[0][0]) return points[0][1];
    if (u >= points[n - 1][0]) return points[n - 1][1];
    let i = 0;
    while (u > points[i + 1][0]) i++;
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const h = x1 - x0;
    const t = (u - x0) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * y0 +
      (t3 - 2 * t2 + t) * h * slope(i) +
      (-2 * t3 + 3 * t2) * y1 +
      (t3 - t2) * h * slope(i + 1)
    );
  };
}

const LENGTH = 1.36; // unidades de escena; la silla mide ~68 cm, escala 2:1
// u = 0 cola, u = 1 punta del tanque.
const halfWidth = profile([
  [0, 0.15],
  [0.12, 0.185],
  [0.32, 0.205],
  [0.5, 0.19],
  [0.68, 0.145],
  [0.86, 0.095],
  [1, 0.06]
]);
const topHeight = profile([
  [0, 0.33],
  [0.13, 0.345],
  [0.28, 0.315],
  [0.42, 0.255],
  [0.6, 0.245],
  [0.82, 0.265],
  [1, 0.27]
]);
const bottomHeight = profile([
  [0, 0.11],
  [0.35, 0.045],
  [0.75, 0.05],
  [1, 0.1]
]);

const EXPONENT = 3.2; // 2 = elipse, más alto = más cuadrada
const SEAM = 0.98; // ángulo (rad) de la costura entre centro y costado
const PAN = 1.05; // la base arranca este ángulo por debajo del horizonte

function signedPow(value: number, power: number) {
  return Math.sign(value) * Math.abs(value) ** power;
}

/** Remate redondeado en la cola y en la punta: la sección se encoge. */
function endScale(u: number) {
  const reach = 0.05;
  const a = Math.min(u, 1 - u) / reach;
  // Cuarto de círculo: el remate queda como una cúpula, no como un cono.
  return a >= 1 ? 1 : Math.sqrt(1 - (1 - Math.max(0, a)) ** 2);
}

/**
 * Punto de la superficie. `phi` recorre la sección: 0 costado derecho (+z),
 * π/2 arriba, π costado izquierdo, 3π/2 abajo.
 */
function surface(u: number, phi: number, out: Vector3) {
  const s = endScale(u);
  // En la punta y la cola la sección se cierra del todo: sin hueco.
  const a = halfWidth(u) * s;
  const top = topHeight(u);
  const bottom = bottomHeight(u);
  const center = (top + bottom) / 2;
  const half = ((top - bottom) / 2) * s;
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  const z = a * signedPow(c, 2 / EXPONENT);
  let y = center + half * signedPow(sn, 2 / EXPONENT);
  // Abombado del asiento: la espuma sube en el centro.
  if (sn > 0 && a > 0) y += 0.016 * s * (1 - (z / a) ** 2) * sn;
  return out.set((u - 0.5) * LENGTH, y, z);
}

/** Más filas cerca de la cola y la punta, donde la forma se curva. */
function uAt(t: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

/**
 * Pieza de la silla entre dos ángulos. UV en metros reales de material
 * (x a lo largo, arco a lo ancho, con cero en el centro de la pieza) para
 * que el grano y los rombos nunca se estiren.
 */
function loftPiece(phi0: number, phi1: number, rows: number, cols: number) {
  const count = (rows + 1) * (cols + 1);
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const p = new Vector3();
  const prev = new Vector3();
  const arcs = new Float32Array(cols + 1);
  for (let i = 0; i <= rows; i++) {
    const u = uAt(i / rows);
    let arc = 0;
    for (let j = 0; j <= cols; j++) {
      surface(u, phi0 + ((phi1 - phi0) * j) / cols, p);
      if (j > 0) arc += p.distanceTo(prev);
      prev.copy(p);
      arcs[j] = arc;
      const k = i * (cols + 1) + j;
      position.set([p.x, p.y, p.z], k * 3);
    }
    for (let j = 0; j <= cols; j++) {
      const k = i * (cols + 1) + j;
      // Escala 2:1 → metros reales = unidades / 2.
      uv.set([(((u - 0.5) * LENGTH) / 2), (arcs[j] - arc / 2) / 2], k * 2);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + cols + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** Normal de la superficie por diferencias finitas. */
function surfaceNormal(u: number, phi: number, out: Vector3) {
  const p = surface(u, phi, new Vector3());
  const du = surface(Math.min(1, u + 1e-3), phi, new Vector3()).sub(p);
  const dphi = surface(u, phi + 1e-3, new Vector3()).sub(p);
  return out.crossVectors(du, dphi).normalize();
}

/** Vivo (piping) a lo largo de la costura de un costado. */
function pipingGeometry(phi: number) {
  const points: Vector3[] = [];
  const normal = new Vector3();
  for (let i = 0; i <= 120; i++) {
    const u = 0.012 + 0.976 * uAt(i / 120);
    const p = surface(u, phi, new Vector3());
    surfaceNormal(u, phi, normal);
    points.push(p.addScaledVector(normal, 0.004));
  }
  return new TubeGeometry(new CatmullRomCurve3(points), 260, 0.0075, 8, false);
}

/**
 * Puntadas: una cápsula por puntada, puestas a lo largo de una línea paralela
 * a la costura, cada una orientada por la tangente y apoyada en la superficie.
 */
function stitchMatrices(phiOffsets: number[]) {
  const matrices: Matrix4[] = [];
  const pitch = 0.013; // 6,5 mm reales entre puntadas (escala 2:1)
  const tangent = new Vector3();
  const normal = new Vector3();
  const quaternion = new Quaternion();
  const basis = new Matrix4();
  const side = new Vector3();
  for (const phi of phiOffsets) {
    // Recorre por longitud de arco real, no por u, para puntadas parejas.
    const samples: Vector3[] = [];
    for (let i = 0; i <= 600; i++) samples.push(surface(0.02 + 0.96 * (i / 600), phi, new Vector3()));
    let carry = 0;
    for (let i = 1; i < samples.length; i++) {
      const segment = samples[i].distanceTo(samples[i - 1]);
      carry += segment;
      if (carry < pitch) continue;
      carry = 0;
      const u = 0.02 + 0.96 * (i / 600);
      const p = samples[i];
      tangent.subVectors(samples[i], samples[i - 1]).normalize();
      surfaceNormal(u, phi, normal);
      // tangente × normal: base de mano derecha (x × y = z). Al revés la
      // matriz es un espejo y las puntadas salen torcidas.
      side.crossVectors(tangent, normal).normalize();
      // La cápsula nace sobre +Y: se gira para que su eje siga la tangente.
      basis.makeBasis(side, tangent, normal);
      quaternion.setFromRotationMatrix(basis);
      const position = p.clone().addScaledVector(normal, 0.0009);
      matrices.push(new Matrix4().compose(position, quaternion, new Vector3(1, 1, 0.55)));
    }
  }
  return matrices;
}

/* --------------------------------------------------------------- Escena */

export type SeatScene = {
  update(look: SeatLook): void;
  rotateBy(radians: number): void;
  dispose(): void;
};

export type SeatSceneOptions = {
  reducedMotion: boolean;
  /** Se llama una vez, cuando el primer cuadro ya está pintado. */
  onReady?: () => void;
};

export function mountSeatScene(canvas: HTMLCanvasElement, initial: SeatLook, options: SeatSceneOptions): SeatScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

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

  const textures = createSeatTextures();
  const toRepeat = (tileMeters: number) => new Vector2(1 / tileMeters, 1 / tileMeters);
  textures.grainNormal.repeat.copy(toRepeat(GRAIN_TILE_M));
  textures.diamondNormal.repeat.copy(toRepeat(DIAMOND_TILE_M));
  textures.gripNormal.repeat.copy(toRepeat(DIAMOND_TILE_M));

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
      normalMap: textures.grainNormal,
      normalScale: new Vector2(0.22, 0.22)
    });

  const centerMaterial = leather(initial.center);
  const sideMaterial = leather(initial.sides);
  const panMaterial = new MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.72, metalness: 0 });
  const stitchMaterial = new MeshStandardMaterial({ color: new Color(initial.stitch), roughness: 0.62 });
  let diamondColor: CanvasTexture | null = null;

  const seat = new Group();
  const rightSeam = SEAM;
  const leftSeam = Math.PI - SEAM;
  const center = new Mesh(loftPiece(rightSeam, leftSeam, 220, 48), centerMaterial);
  const rightSide = new Mesh(loftPiece(-PAN, rightSeam, 220, 26), sideMaterial);
  const leftSide = new Mesh(loftPiece(leftSeam, Math.PI + PAN, 220, 26), sideMaterial);
  const pan = new Mesh(loftPiece(Math.PI + PAN, 2 * Math.PI - PAN, 160, 12), panMaterial);
  const rightPiping = new Mesh(pipingGeometry(rightSeam), sideMaterial);
  const leftPiping = new Mesh(pipingGeometry(leftSeam), sideMaterial);
  seat.add(center, rightSide, leftSide, pan, rightPiping, leftPiping);

  // Doble costura del lado del asiento, a 9 y 17 mm del vivo.
  const stitchShape = new CapsuleGeometry(0.0017, 0.0075, 3, 6);
  const matrices = stitchMatrices([rightSeam + 0.06, rightSeam + 0.11, leftSeam - 0.06, leftSeam - 0.11]);
  const stitches = new InstancedMesh(stitchShape, stitchMaterial, matrices.length);
  matrices.forEach((matrix, index) => stitches.setMatrixAt(index, matrix));
  stitches.instanceMatrix.needsUpdate = true;
  seat.add(stitches);

  // Sombra de contacto bajo la base.
  const shadowTexture = createContactShadow();
  const shadow = new Mesh(
    new PlaneGeometry(LENGTH * 1.25, 0.62),
    new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.9 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  seat.add(shadow);

  const stage = new Group();
  stage.add(seat);
  scene.add(stage);

  function applyLook(look: SeatLook) {
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
  applyLook(initial);

  /* ------------------------------------------------ Tamaño y encuadre */

  function frame() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const narrow = width < 640;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.75 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Encuadre: la silla (1,36 de largo) ocupa ~85 % del ancho disponible.
    const fit = Math.max(1.5, 1.5 / Math.min(1.35, camera.aspect));
    const distance = fit / (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(0.75, Math.min(1.6, camera.aspect));
    camera.position.set(distance * 0.55, distance * 0.72, distance * 0.62);
    camera.lookAt(0, 0.17, 0);
    camera.updateProjectionMatrix();
    needsRender = true;
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

  const resizeObserver = new ResizeObserver(frame);
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
    const dt = Math.min(1 / 30, (now - previous) / 1000);
    previous = now;
    let moving = false;
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
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      seat.traverse((object) => {
        if (object instanceof Mesh || object instanceof InstancedMesh) object.geometry.dispose();
      });
      [centerMaterial, sideMaterial, panMaterial, stitchMaterial, shadow.material].forEach((material) => material.dispose());
      diamondColor?.dispose();
      shadowTexture.dispose();
      textures.dispose();
      environment.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
    }
  };
}
