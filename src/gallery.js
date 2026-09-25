import { validEntry } from "./model.js";
const url = (import.meta.env.VITE_GALLERY_URL || "").replace(/\/$/, "");
import { collection } from "./config.js";
export const sharedGallery = Boolean(url);
const localKey = `little-secret-gallery-v1-${collection}`;
async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "The clothesline could not connect. Please try again.",
    );
  return result;
}
export async function getEntries() {
  if (sharedGallery) {
    const entries = await request(`/shirts?collection=${collection}`);
    return entries
      .filter(
        (e) =>
          typeof e.id === "string" &&
          /^[0-9a-f-]{36}$/i.test(e.id) &&
          typeof e.name === "string" &&
          typeof e.title === "string",
      )
      .map((e) => ({ ...e, image: `${url}/images/${e.id}` }));
  }
  try {
    return JSON.parse(localStorage.getItem(localKey) || "[]").filter(
      validEntry,
    );
  } catch {
    return [];
  }
}
export async function saveEntry(entry) {
  if (!validEntry(entry))
    throw new Error("This shirt could not be saved. Please try again.");
  if (sharedGallery) {
    await request("/shirts", {
      method: "POST",
      body: JSON.stringify({ ...entry, collection }),
    });
    return;
  }
  const entries = await getEntries();
  if (entries.some((e) => e.id === entry.id)) return;
  try {
    localStorage.setItem(
      localKey,
      JSON.stringify([entry, ...entries].slice(0, 24)),
    );
  } catch {
    throw new Error(
      "This device’s storage is full or unavailable. You can still download your shirt.",
    );
  }
}
