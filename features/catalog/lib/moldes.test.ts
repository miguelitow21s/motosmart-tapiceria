// Pruebas de la lista de moldes. Correr: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_MOLDES_TEXT, groupMoldes, invalidMoldeLines, parseMoldes, searchMoldes } from "./moldes.ts";

const all = parseMoldes(DEFAULT_MOLDES_TEXT);

test("la lista de respaldo es válida y sin repetidos", () => {
  assert.deepEqual(invalidMoldeLines(DEFAULT_MOLDES_TEXT), []);
  assert.equal(all.length, DEFAULT_MOLDES_TEXT.split("\n").length);
  assert.ok(all.length > 150);
});

test("lee «Marca: modelo», ignora vacías, repetidas y líneas sin marca", () => {
  const text = "Yamaha: DT 125\n\n  yamaha :  DT-125 \nsolo texto\nHonda: XR 150L\r\nYamaha: NMAX 150";
  assert.deepEqual(parseMoldes(text), [
    { brand: "Yamaha", model: "DT 125" },
    { brand: "Honda", model: "XR 150L" },
    { brand: "Yamaha", model: "NMAX 150" }
  ]);
  assert.deepEqual(invalidMoldeLines(text), ["solo texto"]);
  assert.deepEqual(groupMoldes(parseMoldes(text)), [
    { brand: "Yamaha", models: ["DT 125", "NMAX 150"] },
    { brand: "Honda", models: ["XR 150L"] }
  ]);
});

test("busca sin importar guiones, espacios, tildes ni palabras genéricas", () => {
  const names = (query: string) => searchMoldes(all, query).map((item) => `${item.brand} ${item.model}`);
  assert.deepEqual(names("silla dt 125"), ["Yamaha DT 125/175"]);
  assert.deepEqual(names("N-MAX 2017"), ["Yamaha NMAX 150 (2017)"]);
  assert.ok(names("boxer").every((name) => name.startsWith("Auteco Boxer")));
  assert.ok(names("gto clasica").includes("Kawasaki GTO 125 Clásica"));
  assert.deepEqual(names("silla moto"), []);
  assert.deepEqual(names("harley"), []);
});
