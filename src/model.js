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
  {
    id: "sunburst",
    name: "A sunny little burst",
    short: "Sunburst",
    description: "Rays from the middle, full of sparkle.",
    symbol: "☼",
  },
  {
    id: "chevron",
    name: "A zigzag story",
    short: "Chevron",
    description: "Crisp diagonal folds that zig and zag.",
    symbol: "⌁",
  },
  {
    id: "pebble",
    name: "Soft little pools",
    short: "Pebble",
    description: "Gentle bunches for a painterly pattern.",
    symbol: "◌",
  },
];
export const STICKERS = ["✿", "♡", "★", "☀", "✦", "☁"];
export function createShirt() {
  return {
    id: crypto.randomUUID(),
    fold: 0,
    seed: Math.random() * 100,
    drops: [],
    bands: 0,
    bandPlacements: [],
    name: "",
    title: "",
    stickers: [],
  };
}
export function addDrop(shirt, x, y, shade, size = 0.19, palette = 0) {
  if (
    shirt.drops.length >= 64 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(shade) ||
    !Number.isFinite(size) ||
    !Number.isFinite(palette)
  )
    return false;
  const safeShade = Math.max(0, Math.min(2, shade));
  const safePalette = Math.max(0, Math.min(1, palette));
  shirt.drops.push([
    Math.max(-1, Math.min(1, x)),
    Math.max(-1, Math.min(1, y)),
    safeShade + safePalette * 3,
    Math.max(0.075, Math.min(0.25, size)),
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

export const STICKER_NAMES = {
  "✿": "Flower",
  "♡": "Heart",
  "★": "Star",
  "☀": "Sun",
  "✦": "Sparkle",
  "☁": "Cloud",
};
export function addBand(shirt, point) {
  if (shirt.bands >= 3) return false;
  const angle =
    shirt.fold === 1
      ? Math.PI / 2
      : shirt.fold === 4
        ? Math.PI / 4
        : (shirt.bands * Math.PI) / 3;
  const offset =
    point && Number.isFinite(point.x) && Number.isFinite(point.y)
      ? Math.max(
          -0.35,
          Math.min(0.35, point.x * Math.cos(angle) + point.y * Math.sin(angle)),
        )
      : shirt.fold === 1
        ? (shirt.bands - 1) * 0.32
        : 0;
  shirt.bandPlacements.push({ angle, offset });
  shirt.bands = shirt.bandPlacements.length;
  return true;
}
export function constrainSticker(sticker) {
  sticker.size = Math.max(0.12, Math.min(0.32, sticker.size));
  const margin = sticker.size * 0.55;
  sticker.x = Math.max(-0.41 + margin, Math.min(0.41 - margin, sticker.x));
  sticker.y = Math.max(-0.64 + margin, Math.min(0.42 - margin, sticker.y));
  return sticker;
}
export function addSticker(shirt, symbol, random = false) {
  if (shirt.stickers.length >= 8 || !STICKERS.includes(symbol)) return null;
  const places = [
    [0, 0.1],
    [-0.2, -0.18],
    [0.2, -0.18],
    [0, -0.4],
    [-0.19, 0.24],
    [0.19, 0.24],
    [-0.2, -0.43],
    [0.2, -0.43],
  ];
  const [x, y] = places[shirt.stickers.length];
  const sticker = constrainSticker({
    id: crypto.randomUUID(),
    symbol,
    x: random ? (Math.random() - 0.5) * 0.6 : x,
    y: random ? Math.random() * 0.8 - 0.5 : y,
    size: random ? 0.14 + Math.random() * 0.09 : 0.2,
  });
  shirt.stickers.push(sticker);
  return sticker;
}
