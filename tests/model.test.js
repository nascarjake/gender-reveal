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
  const mixed = createShirt();
  addDrop(mixed, -0.2, 0.4, 1, 0.08, 1);
  assert.deepEqual(mixed.drops[0], [-0.2, 0.4, 4, 0.08]);
  assert.equal(addDrop(shirt, NaN, 0, 0), false);
  assert.equal(addDrop(shirt, 0, 0, 0, 0.1, NaN), false);
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

test("band placements retain drop location and are bounded to three", async () => {
  const { addBand } = await import("../src/model.js");
  const shirt = createShirt();
  addBand(shirt, { x: 0.2, y: 0.1 });
  assert.equal(shirt.bandPlacements[0].offset, 0.2);
  addBand(shirt);
  addBand(shirt);
  assert.equal(addBand(shirt), false);
  assert.equal(shirt.bands, 3);
});
test("stickers remain on the fabric through scaling and dragging", async () => {
  const { addSticker, constrainSticker } = await import("../src/model.js");
  const shirt = createShirt();
  const sticker = addSticker(shirt, "♡");
  sticker.x = 20;
  sticker.y = -20;
  sticker.size = 10;
  constrainSticker(sticker);
  assert.equal(sticker.size, 0.32);
  assert.ok(sticker.x + sticker.size * 0.55 <= 0.41);
  assert.ok(sticker.y - sticker.size * 0.55 >= -0.64);
  for (let i = 0; i < 10; i++) addSticker(shirt, "★");
  assert.equal(shirt.stickers.length, 8);
  assert.equal(addSticker(shirt, "?"), null);
});
