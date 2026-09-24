import test from "node:test";
import assert from "node:assert/strict";
import { createShirt, addDrop, canAdvance, validEntry } from "../src/model.js";
test("the reveal requires tying and dyeing; shirts start fresh", () => {
  const shirt = createShirt();
  assert.equal(canAdvance(0, shirt), true);
  assert.equal(canAdvance(1, shirt), false);
  shirt.bands = 3;
  assert.equal(canAdvance(1, shirt), true);
  assert.equal(canAdvance(2, shirt), false);
  for (let i = 0; i < 3; i++) addDrop(shirt, 0.2, 0.1, 1);
  assert.equal(canAdvance(2, shirt), true);
  assert.equal(createShirt().drops.length, 0);
});
test("dye data stays inside shader limits and records placement and shades", () => {
  const shirt = createShirt();
  addDrop(shirt, 0.1, -0.3, 2);
  assert.deepEqual(shirt.drops[0], [0.1, -0.3, 2, 0.19]);
  assert.equal(addDrop(shirt, NaN, 0, 0), false);
  for (let i = 0; i < 80; i++) addDrop(shirt, 8, -8, 9);
  assert.equal(shirt.drops.length, 64);
  assert.deepEqual(shirt.drops[1], [1, -1, 2, 0.19]);
});
test("gallery accepts bounded PNG data and rejects unsafe or oversized content", () => {
  const entry = {
    id: "example",
    name: "Family",
    title: "Love",
    image: "data:image/png;base64,aGVsbG8=",
  };
  assert.equal(validEntry(entry), true);
  assert.equal(validEntry({ ...entry, image: "javascript:alert(1)" }), false);
  assert.equal(validEntry({ ...entry, name: "x".repeat(33) }), false);
  assert.equal(
    validEntry({
      ...entry,
      image: "data:image/png;base64," + "a".repeat(350000),
    }),
    false,
  );
});
