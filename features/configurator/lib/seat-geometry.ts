/*
  Malla de la silla a partir de una forma (shapes.ts).

  La silla es un "loft": a lo largo del eje X (cola en x<0, punta en x>0) se
  barre una sección transversal cuyo ancho y alto siguen los perfiles de la
  forma. La sección no es un óvalo: arriba es casi plana con un hombro
  redondeado (donde va el vivo) y abajo los costados bajan casi rectos,
  cerrándose un poco hacia la base, como una silla tapizada de verdad.

  Se reparte en las piezas que se cortan en el taller: el centro (asiento),
  los dos costados y la base plástica, más el vivo y la doble costura.

  Escala de escena 2:1 (1 unidad = 50 cm). Todas las formas usan la misma
  cantidad de vértices, así una puede transformarse en otra suavemente.
*/
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Matrix4, Quaternion, TubeGeometry, Vector3 } from "three";
import { shapeProfiles, type SeatShape } from "./shapes";

const CM = 1 / 50;

/** Fracción del alto donde la silla es más ancha (la línea del hombro). */
const SHOULDER = 0.64;
/** Exponentes de la sección: más alto = más cuadrada. */
const EXP_TOP = 3.4;
const EXP_BOTTOM = 6;
/** Cuánto se cierran los costados hacia la base (fracción del ancho). */
const TAPER = 0.12;
/** Abombado de la espuma en el centro del asiento, en cm. */
const CROWN = 1.2;

/** Ángulo (rad) de la costura entre centro y costado: sobre el hombro. */
export const SEAM = 0.62;
/**
 * La base plástica arranca este ángulo por debajo del horizonte: el forro
 * termina antes del piso y se ve el canto negro de la base, como en el taller.
 */
export const PAN = 0.42;

export const ROWS = 220;
const COLS_CENTER = 56;
const COLS_SIDE = 28;
const COLS_PAN = 24;
const PIPING_SEGMENTS = 260;

function signedPow(value: number, power: number) {
  return Math.sign(value) * Math.abs(value) ** power;
}

type Profiles = ReturnType<typeof shapeProfiles>;

/**
 * Punto de la superficie. `phi` recorre la sección: 0 costado derecho (+z),
 * π/2 arriba, π costado izquierdo, 3π/2 abajo.
 */
function surface(p: Profiles, u: number, phi: number, out: Vector3) {
  const a = p.halfWidth(u) * CM;
  const top = p.top(u) * CM;
  const bottom = p.bottom(u) * CM;
  const shoulder = bottom + (top - bottom) * SHOULDER;
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  let y: number;
  let z: number;
  if (sn >= 0) {
    z = a * signedPow(c, 2 / EXP_TOP);
    y = shoulder + (top - shoulder) * signedPow(sn, 2 / EXP_TOP);
    if (a > 0) y += CROWN * CM * (1 - (z / a) ** 2) * sn;
  } else {
    const depth = signedPow(-sn, 2 / EXP_BOTTOM);
    z = a * signedPow(c, 2 / EXP_BOTTOM) * (1 - TAPER * depth);
    y = shoulder - (shoulder - bottom) * depth;
  }
  return out.set((u - 0.5) * p.length * CM, y, z);
}

/** Más filas cerca de la cola y la punta, donde la forma se curva. */
function uAt(t: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

/**
 * Pieza entre dos ángulos. UV en metros reales de material (x a lo largo,
 * arco a lo ancho, con cero en el centro de la pieza): el grano y los rombos
 * nunca se estiran.
 */
function loftPiece(p: Profiles, phi0: number, phi1: number, cols: number) {
  const rows = ROWS;
  const count = (rows + 1) * (cols + 1);
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const point = new Vector3();
  const prev = new Vector3();
  const arcs = new Float32Array(cols + 1);
  for (let i = 0; i <= rows; i++) {
    const u = uAt(i / rows);
    let arc = 0;
    for (let j = 0; j <= cols; j++) {
      surface(p, u, phi0 + ((phi1 - phi0) * j) / cols, point);
      if (j > 0) arc += point.distanceTo(prev);
      prev.copy(point);
      arcs[j] = arc;
      position.set([point.x, point.y, point.z], (i * (cols + 1) + j) * 3);
    }
    for (let j = 0; j <= cols; j++) {
      // Escala 2:1: metros reales = unidades / 2.
      uv.set([((u - 0.5) * p.length * CM) / 2, (arcs[j] - arc / 2) / 2], (i * (cols + 1) + j) * 2);
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
function surfaceNormal(p: Profiles, u: number, phi: number, out: Vector3) {
  const base = surface(p, u, phi, new Vector3());
  const du = surface(p, Math.min(1, u + 1e-3), phi, new Vector3()).sub(base);
  const dphi = surface(p, u, phi + 1e-3, new Vector3()).sub(base);
  return out.crossVectors(du, dphi).normalize();
}

/** Vivo (piping) a lo largo de la costura de un costado. */
function pipingGeometry(p: Profiles, phi: number) {
  const points: Vector3[] = [];
  const normal = new Vector3();
  for (let i = 0; i <= 120; i++) {
    const u = 0.006 + 0.988 * uAt(i / 120);
    const point = surface(p, u, phi, new Vector3());
    surfaceNormal(p, u, phi, normal);
    points.push(point.addScaledVector(normal, 0.004));
  }
  return new TubeGeometry(new CatmullRomCurve3(points), PIPING_SEGMENTS, 0.0072, 8, false);
}

/** Vivo que cruza el asiento de costura a costura, donde se unen dos piezas. */
function crossPipingGeometry(p: Profiles, u: number, phi0: number, phi1: number) {
  const points: Vector3[] = [];
  const normal = new Vector3();
  for (let i = 0; i <= 40; i++) {
    const phi = phi0 + ((phi1 - phi0) * i) / 40;
    const point = surface(p, u, phi, new Vector3());
    surfaceNormal(p, u, phi, normal);
    points.push(point.addScaledVector(normal, 0.004));
  }
  return new TubeGeometry(new CatmullRomCurve3(points), 80, 0.0072, 8, false);
}

/**
 * Puntadas: una cápsula por puntada a lo largo de una línea paralela a la
 * costura, orientada por la tangente y apoyada en la superficie.
 */
function stitchMatrices(p: Profiles, phiOffsets: number[]) {
  const matrices: Matrix4[] = [];
  const pitch = 0.013; // 6,5 mm reales entre puntadas
  const tangent = new Vector3();
  const normal = new Vector3();
  const quaternion = new Quaternion();
  const basis = new Matrix4();
  const side = new Vector3();
  const scale = new Vector3(1, 1, 0.55);
  for (const phi of phiOffsets) {
    // Recorre por longitud de arco real, no por u, para puntadas parejas.
    const samples: Vector3[] = [];
    for (let i = 0; i <= 700; i++) samples.push(surface(p, 0.015 + 0.97 * (i / 700), phi, new Vector3()));
    let carry = 0;
    for (let i = 1; i < samples.length; i++) {
      carry += samples[i].distanceTo(samples[i - 1]);
      if (carry < pitch) continue;
      carry = 0;
      const u = 0.015 + 0.97 * (i / 700);
      tangent.subVectors(samples[i], samples[i - 1]).normalize();
      surfaceNormal(p, u, phi, normal);
      // tangente × normal: base de mano derecha. Al revés la matriz es un
      // espejo y las puntadas salen torcidas.
      side.crossVectors(tangent, normal).normalize();
      basis.makeBasis(side, tangent, normal);
      quaternion.setFromRotationMatrix(basis);
      const position = samples[i].clone().addScaledVector(normal, 0.0009);
      matrices.push(new Matrix4().compose(position, quaternion, scale));
    }
  }
  return matrices;
}

export type SeatGeometries = {
  center: BufferGeometry;
  rightSide: BufferGeometry;
  leftSide: BufferGeometry;
  pan: BufferGeometry;
  rightPiping: BufferGeometry;
  leftPiping: BufferGeometry;
  stitches: Matrix4[];
  /** Vivo transversal de las sillas de dos piezas; no se transforma (como las puntadas). */
  crossPiping: BufferGeometry | null;
  /** Largo en unidades de escena, para el encuadre y la sombra. */
  length: number;
  /** Altura del centro de la silla, para apuntar la cámara. */
  middle: number;
};

export function buildSeatGeometries(shape: SeatShape): SeatGeometries {
  const p = shapeProfiles(shape);
  const rightSeam = SEAM;
  const leftSeam = Math.PI - SEAM;
  let low = Infinity;
  let high = -Infinity;
  for (let i = 0; i <= 40; i++) {
    low = Math.min(low, p.bottom(i / 40));
    high = Math.max(high, p.top(i / 40));
  }
  return {
    center: loftPiece(p, rightSeam, leftSeam, COLS_CENTER),
    rightSide: loftPiece(p, -PAN, rightSeam, COLS_SIDE),
    leftSide: loftPiece(p, leftSeam, Math.PI + PAN, COLS_SIDE),
    pan: loftPiece(p, Math.PI + PAN, 2 * Math.PI - PAN, COLS_PAN),
    rightPiping: pipingGeometry(p, rightSeam),
    leftPiping: pipingGeometry(p, leftSeam),
    // Doble costura sobre el asiento, a unos 9 y 17 mm del vivo.
    stitches: stitchMatrices(p, [rightSeam + 0.07, rightSeam + 0.13, leftSeam - 0.07, leftSeam - 0.13]),
    crossPiping: shape.splitAt === undefined ? null : crossPipingGeometry(p, shape.splitAt, rightSeam, leftSeam),
    length: p.length * CM,
    middle: ((low + high) / 2) * CM
  };
}
