// Pruebas de las firmas de Wompi. Correr: npm test
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { eventChecksum, integritySignature, keysEnvironment, verifyEvent } from "./wompi-crypto.ts";

test("firma de integridad: ejemplo de la documentación de Wompi", () => {
  assert.equal(
    integritySignature("sk8-438k4-xmxm392-sn2m", 2490000, "COP", "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6"),
    "37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5"
  );
});

// Evento de la documentación: propiedades id, status y amount_in_cents.
const SECRET = "prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z";
const event = {
  event: "transaction.updated",
  data: { transaction: { id: "1234-1610641025-49201", status: "APPROVED", amount_in_cents: 4490000 } },
  environment: "prod",
  signature: {
    properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
    checksum: ""
  },
  timestamp: 1530291411
};
const expected = createHash("sha256")
  .update("1234-1610641025-49201APPROVED44900001530291411prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z")
  .digest("hex");

test("checksum de evento: concatena valores, timestamp y secreto", () => {
  assert.equal(eventChecksum(event, SECRET), expected);
});

test("evento firmado se acepta, en minúsculas o mayúsculas", () => {
  assert.ok(verifyEvent({ ...event, signature: { ...event.signature, checksum: expected } }, SECRET));
  assert.ok(verifyEvent({ ...event, signature: { ...event.signature, checksum: expected.toUpperCase() } }, SECRET, expected.toUpperCase()));
});

test("evento alterado o con otro secreto se rechaza", () => {
  const signed = { ...event, signature: { ...event.signature, checksum: expected } };
  const tampered = { ...signed, data: { transaction: { ...event.data.transaction, amount_in_cents: 100 } } };
  assert.equal(verifyEvent(tampered, SECRET), false);
  assert.equal(verifyEvent(signed, "prod_events_otro"), false);
  assert.equal(verifyEvent(signed, SECRET, "a".repeat(64)), false);
  assert.equal(verifyEvent({ ...signed, signature: { properties: [], checksum: expected } }, SECRET), false);
  assert.equal(verifyEvent({ ...event }, SECRET), false);
});

test("las cuatro llaves deben ser del mismo ambiente", () => {
  const test_ = { publicKey: "pub_test_a", privateKey: "prv_test_b", integritySecret: "test_integrity_c", eventsSecret: "test_events_d" };
  assert.equal(keysEnvironment(test_), "test");
  assert.equal(
    keysEnvironment({ publicKey: "pub_prod_a", privateKey: "prv_prod_b", integritySecret: "prod_integrity_c", eventsSecret: "prod_events_d" }),
    "prod"
  );
  assert.equal(keysEnvironment({ ...test_, eventsSecret: "prod_events_d" }), null);
  assert.equal(keysEnvironment({ ...test_, privateKey: "" }), null);
});
