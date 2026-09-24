import test from "node:test";
import assert from "node:assert/strict";
import worker, { validPng } from "../worker/index.js";
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
const origin = "https://example.github.io";
const entry = {
  id: crypto.randomUUID(),
  name: "Family",
  title: "Hello",
  image: png,
  collection: "demo",
};
function env() {
  const calls = [];
  return {
    ALLOWED_ORIGINS: origin,
    SUBMISSIONS: { limit: async () => ({ success: true }) },
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            calls.push({ sql, args });
            return {
              run: async () => ({ success: true }),
              all: async () => ({ results: [] }),
              first: async () => null,
            };
          },
        };
      },
    },
    calls,
  };
}
function post(body, extra = {}) {
  return new Request("https://gallery.test/shirts", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...extra },
    body: JSON.stringify(body),
  });
}
test("gallery isolates collections in bound queries", async () => {
  const e = env(),
    r = await worker.fetch(
      new Request("https://gallery.test/shirts?collection=demo"),
      e,
    );
  assert.equal(r.status, 200);
  assert.deepEqual(e.calls[0].args, ["demo"]);
});
test("a valid image is saved; dates are assigned by the database", async () => {
  const e = env(),
    r = await worker.fetch(post(entry), e);
  assert.equal(r.status, 201);
  assert.equal(e.calls.length, 1);
  assert.equal(e.calls[0].args[1], "demo");
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), origin);
});
test("submission rejects unrelated origins before touching the database", async () => {
  const e = env(),
    r = await worker.fetch(
      post(entry, { Origin: "https://unrelated.test" }),
      e,
    );
  assert.equal(r.status, 403);
  assert.equal(e.calls.length, 0);
});
test("submission is rate limited", async () => {
  const e = env();
  e.SUBMISSIONS.limit = async () => ({ success: false });
  assert.equal((await worker.fetch(post(entry), e)).status, 429);
  assert.equal(e.calls.length, 0);
});
test("oversized, invalid JSON, malformed PNG and invalid collections are rejected", async () => {
  const e = env();
  assert.equal(
    (await worker.fetch(post({ ...entry, image: "x".repeat(370000) }), e))
      .status,
    413,
  );
  assert.equal(
    (
      await worker.fetch(
        post({ ...entry, image: "data:image/png;base64,aGVsbG8=" }),
        e,
      )
    ).status,
    400,
  );
  assert.equal(
    (await worker.fetch(post({ ...entry, collection: "other" }), e)).status,
    400,
  );
  const r = post(entry);
  assert.equal(
    (await worker.fetch(new Request(r, { body: "{broken" }), e)).status,
    400,
  );
  assert.equal(e.calls.length, 0);
});
test("PNG header and dimensions are checked before storing a submitted image", () => {
  assert.equal(validPng(png), true);
  assert.equal(validPng("data:image/png;base64,AAAA"), false);
  const bytes = Buffer.from(png.split(",")[1], "base64");
  bytes.writeUInt32BE(9000, 16);
  assert.equal(
    validPng("data:image/png;base64," + bytes.toString("base64")),
    false,
  );
});
