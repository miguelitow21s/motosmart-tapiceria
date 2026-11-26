// Pruebas de la forma según la moto. Correr: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { guessSeatShape, readMotoParam } from "./guess-shape.ts";

test("reconoce la forma por el modelo, escrito como sea", () => {
  const cases: Array<[string, string | null]> = [
    ["Yamaha DT 125", "enduro"],
    ["yamaha dt-125", "enduro"],
    ["DT125", "enduro"],
    ["Honda XRE 300", "enduro"],
    ["AKT TT 125R", "enduro"],
    ["Yamaha NMAX 2023", "scooter"],
    ["Kymco Agility Digital 3.0", "scooter"],
    ["Bajaj Boxer CT 100", "boxer"],
    ["Pulsar NS 200", "deportiva"],
    ["Yamaha FZ 25", "deportiva"],
    ["Honda CRF 250", "motocross"],
    ["Yamaha RX-100", "calle"],
    ["AKT NKD 125", "calle"],
    ["", null],
    ["2004", null]
  ];
  for (const [moto, shape] of cases) assert.equal(guessSeatShape(moto), shape, moto);
});

test("limpia el ?moto= del enlace", () => {
  assert.equal(readMotoParam("Yamaha  RX-100"), "Yamaha RX-100");
  assert.equal(readMotoParam("Suzuki Design 2"), "Suzuki");
  assert.equal(readMotoParam("Suzuki Diseño 3"), "Suzuki");
  assert.equal(readMotoParam("<script>NMAX</script>"), "script NMAX /script");
  assert.equal(readMotoParam(null), "");
  assert.equal(readMotoParam("x".repeat(100)).length, 60);
});
