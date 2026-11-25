/*
  Formas de silla por tipo de moto, medidas en centímetros reales.

  Cada forma son tres perfiles a lo largo de la silla (u = 0 la cola,
  u = 1 la punta que va contra el tanque):
  - halfWidth: medio ancho del asiento, visto desde arriba.
  - top: altura de la superficie donde uno se sienta, desde el piso.
  - bottom: altura de la base plástica, que sigue el chasis.

  No usa three.js: el selector dibuja con estos mismos datos la silueta de
  cada opción, y la escena 3D arma la malla.
*/

export type Point = [number, number];

export type SeatShapeId = "boxer" | "calle" | "deportiva" | "scooter" | "enduro" | "motocross";

export type SeatShape = {
  id: SeatShapeId;
  label: string;
  /** Motos de ejemplo, para que el cliente reconozca la suya. */
  examples: string;
  /** Largo total, en cm. */
  length: number;
  halfWidth: Point[];
  top: Point[];
  bottom: Point[];
  /** Dónde va la franja que cruza el asiento (u), del color de los costados. */
  bandAt?: number;
  /** Qué tan cuadrada es la sección: 3,4 redondeada (calle), 6 de cajón (enduro). */
  squareness?: number;
  /** Largo de la curva de la cola vista desde arriba, en cm: 10 es una U, 3 casi recta. */
  tailRound?: number;
  /** Lo mismo para la punta. */
  noseRound?: number;
};

export const SEAT_SHAPES: SeatShape[] = [
  {
    // Boxer CT (foto del catálogo): una pieza larga y gruesa, ancho parejo, cola y punta en U,
    // el parrillero un poco más alto y el piloto plano. Sección redondeada.
    id: "boxer",
    label: "Boxer CT",
    examples: "Bajaj Boxer CT 100, Platino",
    length: 74,
    squareness: 2.8,
    tailRound: 12,
    noseRound: 9,
    halfWidth: [
      [0, 13],
      [0.12, 14.5],
      [0.4, 14.5],
      [0.7, 13.5],
      [0.9, 12],
      [1, 10.5]
    ],
    top: [
      [0, 15.5],
      [0.1, 16.4],
      [0.25, 16.2],
      [0.42, 14.6],
      [0.58, 13.6],
      [0.85, 13.4],
      [1, 13]
    ],
    bottom: [
      [0, 5],
      [0.15, 3.6],
      [0.6, 3],
      [1, 3.6]
    ]
  },
  {
    // Una pieza con escalón suave: parrillero un poco más alto, piloto hundido.
    id: "calle",
    label: "Calle",
    examples: "AKT NKD, Honda CB, Yamaha YBR",
    length: 72,
    bandAt: 0.5,
    halfWidth: [
      [0, 9.5],
      [0.15, 11.5],
      [0.4, 12.5],
      [0.6, 14.5],
      [0.8, 12.5],
      [1, 7.5]
    ],
    top: [
      [0, 16.2],
      [0.3, 16.4],
      [0.42, 15.2],
      [0.53, 13],
      [0.7, 12.6],
      [0.88, 13.2],
      [1, 13.8]
    ],
    bottom: [
      [0, 7.6],
      [0.35, 6.2],
      [0.55, 3.4],
      [0.8, 3],
      [1, 5]
    ]
  },
  {
    // Dos niveles: parrillero alto y angosto, un escalón casi vertical y el piloto bajo y ancho.
    id: "deportiva",
    label: "Deportiva",
    examples: "Pulsar NS, Yamaha FZ, Apache",
    length: 72,
    bandAt: 0.445,
    halfWidth: [
      [0, 8],
      [0.12, 9.5],
      [0.34, 10],
      [0.42, 11.5],
      [0.52, 14.5],
      [0.62, 15.5],
      [0.76, 14],
      [0.9, 9.5],
      [1, 6.5]
    ],
    top: [
      [0, 18.4],
      [0.06, 19],
      [0.3, 18.6],
      [0.37, 17.8],
      [0.42, 14],
      [0.46, 12.8],
      [0.62, 12.2],
      [0.8, 12.8],
      [0.92, 14],
      [1, 14.6]
    ],
    bottom: [
      [0, 11],
      [0.3, 9.6],
      [0.38, 8],
      [0.46, 3],
      [0.75, 2.5],
      [0.9, 4],
      [1, 7]
    ]
  },
  {
    // Ancha y larga: piloto bajo adelante, un lomo de apoyo y el parrillero más alto.
    id: "scooter",
    label: "Scooter",
    examples: "Yamaha NMAX, AKT Dynamic",
    length: 82,
    halfWidth: [
      [0, 12],
      [0.14, 15],
      [0.4, 16],
      [0.6, 17.5],
      [0.8, 17],
      [0.94, 14.5],
      [1, 12]
    ],
    top: [
      [0, 17.4],
      [0.15, 18],
      [0.38, 17.6],
      [0.46, 19.2],
      [0.52, 17.2],
      [0.58, 13.8],
      [0.66, 12.6],
      [0.86, 12.6],
      [1, 13.6]
    ],
    bottom: [
      [0, 6],
      [0.3, 4],
      [0.7, 2.6],
      [1, 4]
    ]
  },
  {
    // Enduro (DT, XTZ, XRE): de cajón, cola cortada casi recta y con la base arqueada,
    // franja al pie de la subida y la punta que trepa sobre el tanque.
    id: "enduro",
    label: "Enduro",
    examples: "Yamaha DT, XTZ, Honda XRE",
    length: 86,
    bandAt: 0.68,
    squareness: 6,
    tailRound: 4,
    noseRound: 6,
    halfWidth: [
      [0, 11],
      [0.1, 12],
      [0.5, 12.5],
      [0.66, 12],
      [0.8, 9.5],
      [0.92, 7],
      [1, 5.5]
    ],
    top: [
      [0, 18],
      [0.3, 18.4],
      [0.6, 17.8],
      [0.68, 18.6],
      [0.8, 24],
      [0.92, 29],
      [1, 30.5]
    ],
    bottom: [
      [0, 9.5],
      [0.1, 6.5],
      [0.3, 5],
      [0.62, 5],
      [0.75, 8.5],
      [0.9, 18],
      [1, 23]
    ]
  },
  {
    // Motocross (CRF, KX, YZ): muy larga y angosta, plana, cola delgada y una subida larga
    // que lleva la punta bien arriba del tanque.
    id: "motocross",
    label: "Motocross",
    examples: "Honda CRF, Kawasaki KX, Yamaha YZ",
    length: 96,
    squareness: 4.5,
    tailRound: 6,
    noseRound: 5,
    halfWidth: [
      [0, 7],
      [0.12, 9.5],
      [0.45, 11],
      [0.6, 11.5],
      [0.75, 9.5],
      [0.9, 6.5],
      [1, 4.5]
    ],
    top: [
      [0, 15.5],
      [0.2, 16.4],
      [0.5, 16],
      [0.6, 16.6],
      [0.78, 23],
      [1, 31.5]
    ],
    bottom: [
      [0, 10.5],
      [0.15, 7],
      [0.45, 5.5],
      [0.58, 6.5],
      [0.78, 14],
      [1, 25.5]
    ]
  }
];

export const DEFAULT_SEAT_SHAPE: SeatShapeId = "deportiva";

export function seatShape(id: SeatShapeId) {
  return SEAT_SHAPES.find((shape) => shape.id === id) ?? SEAT_SHAPES[0];
}

/**
 * Curva suave que pasa por los puntos sin pasarse de largo (Hermite cúbica
 * monótona, Fritsch-Carlson): un escalón de la silla no hace ondas.
 */
export function profile(points: Point[]) {
  const n = points.length;
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array<number>(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (u: number) => {
    if (u <= xs[0]) return ys[0];
    if (u >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (u > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (u - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

/** Radio del canto de la cola y la punta vistas de lado, en cm. */
const END_RADIUS_TOP = 2.6;
const END_RADIUS_BOTTOM = 1.2;

/** Cuánto baja el borde superior (o sube el inferior) cerca de las puntas. */
function cornerDrop(distanceCm: number, radius: number) {
  if (distanceCm >= radius) return 0;
  const k = radius - distanceCm;
  return radius - Math.sqrt(Math.max(0, radius * radius - k * k));
}

export type ShapeProfiles = {
  /** Largo en cm. */
  length: number;
  /** Exponente de la sección de arriba (ver `squareness`). */
  squareness: number;
  /** Medio ancho a la altura del hombro, con la cola y la punta redondeadas en planta. */
  halfWidth(u: number): number;
  top(u: number): number;
  bottom(u: number): number;
};

/** Perfiles en cm, con las puntas ya redondeadas (planta en U y canto vertical). */
export function shapeProfiles(shape: SeatShape): ShapeProfiles {
  const width = profile(shape.halfWidth);
  const top = profile(shape.top);
  const bottom = profile(shape.bottom);
  const length = shape.length;
  // En planta, la cola y la punta son medio óvalo tan largo como su medio
  // ancho (con tope por forma): la U de una silla de verdad, no una cúpula.
  const tailReach = Math.min(width(0), shape.tailRound ?? 10) / length;
  const noseReach = Math.min(width(1), shape.noseRound ?? 8) / length;
  return {
    length,
    squareness: shape.squareness ?? 3.4,
    halfWidth(u) {
      const a = u < tailReach ? u / tailReach : 1 - u < noseReach ? (1 - u) / noseReach : 1;
      return width(u) * (a >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - a) ** 2)));
    },
    top(u) {
      const distance = Math.min(u, 1 - u) * length;
      return top(u) - cornerDrop(distance, END_RADIUS_TOP);
    },
    bottom(u) {
      const distance = Math.min(u, 1 - u) * length;
      return bottom(u) + cornerDrop(distance, END_RADIUS_BOTTOM);
    }
  };
}

/**
 * Silueta de lado (la punta a la derecha) para el selector, como `d` de un
 * <path> en un viewBox de 0 0 100 32 (cm). Todas a la misma escala: se ve
 * cuál es más larga o más alta.
 */
export const SILHOUETTE_WIDTH = 100;
export const SILHOUETTE_HEIGHT = 32;

export function silhouettePath(shape: SeatShape) {
  const p = shapeProfiles(shape);
  const steps = 48;
  const x0 = (SILHOUETTE_WIDTH - p.length) / 2;
  const topLine: string[] = [];
  const bottomLine: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = (x0 + u * p.length).toFixed(1);
    topLine.push(`${x} ${(SILHOUETTE_HEIGHT - p.top(u)).toFixed(1)}`);
    bottomLine.unshift(`${x} ${(SILHOUETTE_HEIGHT - p.bottom(u)).toFixed(1)}`);
  }
  return `M${topLine.join("L")}L${bottomLine.join("L")}Z`;
}
