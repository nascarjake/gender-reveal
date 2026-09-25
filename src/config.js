// The Clark family's reveal. Explicit "demo" keeps practice shirts separate.
const setting = import.meta.env.VITE_REVEAL;
export const demo = setting === "demo";
export const color = setting === "blue" || demo ? "blue" : "pink";
export const collection = demo ? "demo" : color;
