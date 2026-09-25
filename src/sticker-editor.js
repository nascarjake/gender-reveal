import { constrainSticker, STICKER_NAMES } from "./model.js";

// The live editor and PNG export share the same shirt-space coordinates and size.
export function paintStickers(ctx, stickers, width, height) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const sticker of stickers) {
    const pixels = (sticker.size * height) / 2.08;
    ctx.font = `${pixels}px Georgia`;
    ctx.fillStyle = "#fffaf2";
    ctx.strokeStyle = "#34372c";
    ctx.lineWidth = pixels * 0.025;
    const x = width / 2 + (sticker.x * height) / 2.08;
    const y = height / 2 - (sticker.y * height) / 2.08;
    ctx.fillText(sticker.symbol, x, y);
    ctx.strokeText(sticker.symbol, x, y);
  }
  ctx.restore();
}

export class StickerEditor {
  constructor(layer, canvas, getState, onSelect, onChange) {
    Object.assign(this, { layer, canvas, getState, onSelect, onChange });
  }
  sync() {
    const { shirt, selected, enabled } = this.getState();
    const ids = shirt.stickers.map((s) => s.id).join(",");
    if (ids !== this.ids) {
      this.ids = ids;
      this.layer.replaceChildren();
      for (const sticker of shirt.stickers) {
        const button = document.createElement("button");
        button.className = "placed-sticker";
        button.dataset.id = sticker.id;
        button.innerHTML = `<span aria-hidden="true">${sticker.symbol}</span>`;
        button.setAttribute(
          "aria-label",
          `${STICKER_NAMES[sticker.symbol]} on shirt. Drag or use arrow keys to move.`,
        );
        button.onfocus = () => {
          if (this.getState().selected !== sticker.id)
            this.onSelect(sticker.id);
        };
        button.onpointerdown = (event) => {
          if (!this.getState().enabled) return;
          event.preventDefault();
          this.onSelect(sticker.id);
          button.focus({ preventScroll: true });
          const start = {
            x: event.clientX,
            y: event.clientY,
            sx: sticker.x,
            sy: sticker.y,
          };
          button.setPointerCapture(event.pointerId);
          button.classList.add("dragging");
          button.onpointermove = (move) => {
            if (!this.getState().enabled) return;
            const height = this.canvas.getBoundingClientRect().height;
            sticker.x = start.sx + ((move.clientX - start.x) * 2.08) / height;
            sticker.y = start.sy - ((move.clientY - start.y) * 2.08) / height;
            constrainSticker(sticker);
            this.sync();
          };
          const finish = () => {
            button.onpointermove = null;
            button.classList.remove("dragging");
            this.onChange();
          };
          button.onpointerup = finish;
          button.onpointercancel = finish;
          button.onlostpointercapture = finish;
        };
        button.onkeydown = (event) => {
          if (!this.getState().enabled) return;
          const moves = {
            ArrowLeft: [-0.025, 0],
            ArrowRight: [0.025, 0],
            ArrowUp: [0, 0.025],
            ArrowDown: [0, -0.025],
          };
          if (moves[event.key]) {
            event.preventDefault();
            sticker.x += moves[event.key][0];
            sticker.y += moves[event.key][1];
          } else if (["+", "=", "-"].includes(event.key)) {
            event.preventDefault();
            sticker.size += event.key === "-" ? -0.02 : 0.02;
          } else return;
          constrainSticker(sticker);
          this.sync();
          this.onChange();
        };
        this.layer.append(button);
      }
    }
    const { width, height } = this.canvas.getBoundingClientRect();
    for (const button of this.layer.children) {
      const sticker = shirt.stickers.find((s) => s.id === button.dataset.id);
      const pixels = (sticker.size * height) / 2.08;
      button.style.left = `${width / 2 + (sticker.x * height) / 2.08}px`;
      button.style.top = `${height / 2 - (sticker.y * height) / 2.08}px`;
      button.style.setProperty("--sticker-size", `${pixels}px`);
      button.style.setProperty("--sticker-stroke", `${pixels * 0.025}px`);
      button.classList.toggle("selected", enabled && sticker.id === selected);
      button.setAttribute("aria-pressed", String(sticker.id === selected));
      button.disabled = !enabled;
    }
  }
}
