import { validEntry } from "../src/model.js";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const collections = new Set(["demo", "pink", "blue"]);
const maxBody = 360000;
export function validPng(image) {
  try {
    const data = atob(image.split(",")[1]);
    if (
      data.length < 24 ||
      data.slice(0, 8) !== "\x89PNG\r\n\x1a\n" ||
      data.slice(12, 16) !== "IHDR"
    )
      return false;
    const view = new DataView(
      Uint8Array.from(data.slice(16, 24), (char) => char.charCodeAt(0)).buffer,
    );
    const width = view.getUint32(0),
      height = view.getUint32(4);
    return width > 0 && height > 0 && width <= 512 && height <= 620;
  } catch {
    return false;
  }
}
async function boundedJson(request) {
  if (Number(request.headers.get("Content-Length")) > maxBody)
    throw new Error("TOO_LARGE");
  if (!request.body) throw new Error("BAD_JSON");
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBody) {
      await reader.cancel();
      throw new Error("TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("BAD_JSON");
  }
}
export default {
  /** @param {Request} request @param {Env} env */
  async fetch(request, env) {
    const url = new URL(request.url),
      origin = request.headers.get("Origin");
    const allowed = env.ALLOWED_ORIGINS.split(",").includes(origin);
    const headers = {
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    };
    if (allowed) headers["Access-Control-Allow-Origin"] = origin;
    const json = (data, status = 200) =>
      Response.json(data, { status, headers });
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: allowed ? 204 : 403,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    try {
      if (url.pathname === "/health" && request.method === "GET")
        return json({ status: "ok" });
      if (url.pathname === "/shirts" && request.method === "GET") {
        const collection = url.searchParams.get("collection");
        if (!collections.has(collection))
          return json({ error: "Choose a valid collection." }, 400);
        const { results } = await env.DB.prepare(
          "SELECT id,name,title,created_at FROM shirts WHERE collection = ? ORDER BY created_at DESC LIMIT 1000",
        )
          .bind(collection)
          .all();
        return json(results);
      }
      if (url.pathname.startsWith("/images/") && request.method === "GET") {
        const id = url.pathname.slice(8);
        if (!uuid.test(id)) return json({ error: "Shirt not found." }, 404);
        const row = await env.DB.prepare(
          "SELECT image FROM shirts WHERE id = ?",
        )
          .bind(id)
          .first();
        if (!row) return json({ error: "Shirt not found." }, 404);
        const bytes = Uint8Array.from(atob(row.image.split(",")[1]), (c) =>
          c.charCodeAt(0),
        );
        return new Response(bytes, {
          headers: {
            ...headers,
            "Content-Type": "image/png",
            "Cache-Control": "public,max-age=3600",
            "Content-Security-Policy": "default-src 'none'",
          },
        });
      }
      if (url.pathname === "/shirts" && request.method === "POST") {
        if (!allowed)
          return json({ error: "Please hang your shirt from the game." }, 403);
        if (
          !request.headers.get("Content-Type")?.startsWith("application/json")
        )
          return json({ error: "Send a shirt as JSON." }, 415);
        const { success } = await env.SUBMISSIONS.limit({
          key: request.headers.get("CF-Connecting-IP") || "local",
        });
        if (!success)
          return json(
            {
              error:
                "Lots of love arriving at once! Please try again in a minute.",
            },
            429,
          );
        const entry = await boundedJson(request);
        if (
          !validEntry(entry) ||
          !uuid.test(entry.id) ||
          !collections.has(entry.collection) ||
          !validPng(entry.image)
        )
          return json(
            { error: "This shirt could not be saved. Please try again." },
            400,
          );
        await env.DB.prepare(
          "INSERT OR IGNORE INTO shirts (id,collection,name,title,image) VALUES (?,?,?,?,?)",
        )
          .bind(
            entry.id,
            entry.collection,
            entry.name,
            entry.title,
            entry.image,
          )
          .run();
        return json({ id: entry.id }, 201);
      }
      return json({ error: "Not found." }, 404);
    } catch (error) {
      if (error.message === "TOO_LARGE")
        return json(
          {
            error:
              "This image is too large. Please download your shirt instead.",
          },
          413,
        );
      if (error.message === "BAD_JSON")
        return json({ error: "This shirt could not be read." }, 400);
      if (error.message.includes("CLOTHESLINE_FULL"))
        return json(
          {
            error:
              "The clothesline is full of love! Please download your shirt to keep it.",
          },
          409,
        );
      console.error(
        JSON.stringify({ event: "gallery_request_failed", path: url.pathname }),
      );
      return json(
        {
          error:
            "The clothesline is having a little trouble. Please try again.",
        },
        500,
      );
    }
  },
};
