export const FOLDS = [
  {
    id: "spiral",
    name: "The classic swirl",
    short: "Spiral",
    description: "Twist the middle. Let it swirl.",
    symbol: "◎",
  },
  {
    id: "accordion",
    name: "Happy little stripes",
    short: "Accordion",
    description: "Back and forth, like a paper fan.",
    symbol: "≋",
  },
  {
    id: "crumple",
    name: "A beautiful mess",
    short: "Scrunch",
    description: "A little scrunch. A lot of personality.",
    symbol: "✳",
  },
];
export const STICKERS = ["✿", "♡", "★", "☀"];
export function createShirt() {
  return {
    id: crypto.randomUUID(),
    fold: 0,
    seed: Math.random() * 100,
    drops: [],
    bands: 0,
    name: "",
    title: "",
    sticker: "",
  };
}
export function addDrop(shirt, x, y, shade, size = 0.19) {
  if (shirt.drops.length >= 64 || !Number.isFinite(x) || !Number.isFinite(y))
    return false;
  shirt.drops.push([
    Math.max(-1, Math.min(1, x)),
    Math.max(-1, Math.min(1, y)),
    Math.max(0, Math.min(2, shade)),
    size,
  ]);
  return true;
}
export function canAdvance(step, shirt) {
  return (
    step === 0 ||
    (step === 1 && shirt.bands >= 3) ||
    (step === 2 && shirt.drops.length >= 3)
  );
}
export function validEntry(entry) {
  return (
    entry &&
    typeof entry.id === "string" &&
    typeof entry.image === "string" &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(entry.image) &&
    entry.image.length < 350000 &&
    typeof entry.name === "string" &&
    entry.name.length <= 32 &&
    typeof entry.title === "string" &&
    entry.title.length <= 48
  );
}
