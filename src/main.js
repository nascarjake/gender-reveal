import "./style.css";
import {
  FOLDS,
  STICKERS,
  STICKER_NAMES,
  createShirt,
  addDrop,
  canAdvance,
  addBand,
  addSticker,
  constrainSticker,
} from "./model.js";
import { ShirtRenderer } from "./renderer.js";
import { getEntries, saveEntry, sharedGallery } from "./gallery.js";
import { demo, color } from "./config.js";
import { StickerEditor, paintStickers } from "./sticker-editor.js";
const uiVersion = new URLSearchParams(window.location.search).get("ui");
const useV2 = uiVersion !== "v1";
document.body.classList.toggle("ui-v2", useV2);
let selectedSticker = null,
  finishTab = "decorate";
let shirt = createShirt(),
  step = 0,
  shade = 1,
  dyeFamily = 0,
  brush = 1,
  folded = 0,
  reveal = 0,
  animating = false,
  saved = false,
  saving = false,
  hasRevealed = false,
  view = "studio",
  shirtNumber = 1;
let renderer,
  animationFrame,
  keyboardPoint = { x: 0, y: 0 };
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const BRUSH_SIZES = [0.085, 0.145, 0.225];
const $ = (s) => document.querySelector(s);
const icons = {
  shirt: '<path d="m8 3-5 4 3 5 2-1v10h8V11l2 1 3-5-5-4c-1 3-7 3-8 0Z"/>',
  line: '<path d="M2 5q10 5 20 0M6 6v4m12-4v4M4 11l3-2 3 2-1 3-1-1v6H5v-6l-1 1-1-3m11 0 3-2 3 2-1 3-1-1v6h-3v-6l-1 1-1-3"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 9M4 4v6h6"/>',
  heart:
    '<path d="M12 21S2 14 2 7a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 7-10 14-10 14Z"/>',
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.shirt}</svg>`;
}
$("#app").innerHTML = `
${
  useV2
    ? `<section class="game-intro" id="game-intro" role="dialog" aria-modal="true" aria-labelledby="game-intro-title"><div class="game-intro-sparkles" aria-hidden="true"><span>✦</span><span>●</span><span>✳</span><span>●</span><span>✦</span><span>●</span></div><div class="game-intro-card"><div class="game-intro-icon" aria-hidden="true">${icon("shirt")}</div><p class="game-intro-kicker">A LITTLE FAMILY UPDATE</p><h1 id="game-intro-title">The Clark family is expecting another <em>blessing</em> in 2027.</h1><p class="game-intro-copy">Let’s play a game to find out what we’re having!</p><div class="game-intro-levels" aria-label="Fold, tie, dye, and reveal"><span>Fold</span><i></i><span>Tie</span><i></i><span>Dye</span><i></i><span>Reveal</span></div><button class="button primary game-intro-button" id="start-game">Let’s play ${icon("arrow")}</button><p class="game-intro-note">Everything stays a secret until the big reveal.</p></div></section>`
    : ""
}
<header class="header"><a class="brand" href="#" aria-label="A little secret home"><span class="brand-flower">✳</span><span>a little secret<span class="brand-dot">.</span></span></a><nav aria-label="Main navigation"><button class="nav-link active" id="studio-nav" aria-label="The dye studio">${icon("shirt")} <span class="nav-desktop">The dye studio</span><span class="nav-mobile">Studio</span></button><button class="nav-link" id="gallery-nav" aria-label="The clothesline">${icon("line")} <span class="nav-desktop">The clothesline</span><span class="nav-mobile">Clothesline</span> <span class="count" id="gallery-count">0</span></button></nav><span class="header-note">THE CLARK FAMILY · EST. 2021 ${icon("heart")}</span></header>
<main>
<section id="studio-view">
<div class="intro"><div><p class="eyebrow">THE CLARK FAMILY · EST. 2021</p><h1>Something little. <br>Something <em>lovely.</em></h1><p class="intro-copy">Make a tie-dye tee. Unfold a little secret. <br>A little hello to the newest member of the Clark family.</p></div><div class="intro-stamp"><span>OH, BABY!</span><strong>Made<br>with love</strong><span>ONE TINY TEE AT A TIME</span></div></div>
<div class="workspace">
<section class="workbench" aria-label="Interactive tie-dye workspace"><div class="bench-top"><span class="bench-label"><span class="status-dot"></span><span id="bench-label-text">CHOOSE YOUR FOLD</span></span><span id="edition">NO. 001</span></div><div class="canvas-wrap"><canvas id="shirt-canvas" width="1100" height="1000" tabindex="0" role="img" aria-label="Your shirt. Choose a fold to get started."></canvas><div id="sticker-layer" aria-label="Stickers on your shirt"></div><span class="side-note">a little messy is a little magic</span><div class="reveal-badge" id="reveal-badge" hidden><span id="reveal-kicker"></span><strong id="reveal-title"></strong></div><div class="canvas-error" id="canvas-error" hidden><strong>Let’s get the studio ready.</strong><p>This game needs WebGL. Try a browser with hardware acceleration enabled.</p></div></div><div class="bench-bottom"><span id="bench-hint">Your blank canvas. So many possibilities.</span><button class="text-button" id="reset-button">${icon("reset")} Start over</button></div></section>
<aside class="controls"><div class="quest-status"><div class="quest-status-copy"><span>YOUR TIE-DYE QUEST</span><strong id="quest-progress-copy">LEVEL 1 OF 4</strong></div><div class="quest-meter" role="progressbar" aria-label="Tie-dye quest progress" aria-valuemin="1" aria-valuemax="4" aria-valuenow="1"><span id="quest-meter-fill"></span></div></div><ol class="steps" aria-label="Your progress"><li class="active"><span>1</span>Fold</li><li><span>2</span>Tie</li><li><span>3</span>Dye</li><li><span>4</span>Reveal</li></ol><div id="step-content"></div><div class="secret-note">${icon("heart")}<p>A little secret, kept under wraps.<br><span>Everything stays gray until the big reveal.</span></p></div></aside>
</div>
<div class="under-workspace"><span>NO TWO SHIRTS ALIKE. JUST LIKE NO LOVE QUITE LIKE THIS.</span><span>Fold it. Dye it. Feel all the feelings. <span class="tiny-flower">✳</span></span></div>
</section>
<section id="gallery-view" hidden><div class="gallery-heading"><p class="eyebrow">A WHOLE LOT OF LOVE, HUNG UP TO DRY.</p><h1>Our little <em>clothesline.</em></h1><p id="gallery-description"></p><div class="gallery-actions"><button class="button secondary" id="back-to-studio">${icon("shirt")} Back to my shirt</button><button class="button primary" id="new-shirt">Make another shirt ${icon("arrow")}</button></div></div><div id="gallery-items" class="clothesline"></div><button class="text-button gallery-refresh" id="refresh-gallery">${icon("reset")} Refresh the clothesline</button></section>
</main><footer><span>a little secret<span class="brand-dot">.</span></span><p>The Clark family · Est. 2021</p><span id="demo-label">${demo ? "DEMO STUDIO · SAMPLE REVEAL" : "MADE FOR OUR FAVORITE PEOPLE"}</span></footer>
<div id="toast" role="status" aria-live="polite"></div>
<dialog id="reset-dialog"><form method="dialog"><span class="dialog-flower">✳</span><h2>A fresh little start?</h2><p>Your current shirt will be cleared. Download it or hang it up first if you want to keep it.</p><div class="dialog-actions"><button value="cancel" class="button secondary">Keep this shirt</button><button value="reset" class="button primary">Start fresh ${icon("arrow")}</button></div></form></dialog>
<dialog id="spoiler-dialog"><form method="dialog"><span class="dialog-flower">♡</span><h2>There’s a secret on the line.</h2><p>The finished shirts give away the surprise. Make your own first, or peek if you’re ready!</p><div class="dialog-actions"><button value="cancel" class="button primary">Make my shirt</button><button value="peek" class="button secondary">Take a peek</button></div></form></dialog>`;
const gameIntro = $("#game-intro");
if (gameIntro) {
  document.body.classList.add("intro-open");
  $(".header").inert = true;
  $("main").inert = true;
  $("#start-game").onclick = () => {
    gameIntro.classList.add("leaving");
    document.body.classList.remove("intro-open");
    $(".header").inert = false;
    $("main").inert = false;
    const finishIntro = () => {
      gameIntro.remove();
      resize();
      $("#next-button")?.focus({ preventScroll: true });
    };
    if (reduced.matches) finishIntro();
    else setTimeout(finishIntro, 420);
  };
}
try {
  renderer = new ShirtRenderer($("#shirt-canvas"));
} catch (error) {
  console.error(error);
  $("#canvas-error").hidden = false;
}
const stickerEditor = new StickerEditor(
  $("#sticker-layer"),
  $("#shirt-canvas"),
  () => ({
    shirt,
    selected: selectedSticker,
    enabled: step === 4 && !saved && !saving,
  }),
  (id) => {
    selectedSticker = id;
    finishTab = "decorate";
    renderStep();
  },
  () => updateStickerSize(),
);
function draw() {
  if (renderer) renderer.draw(shirt, { folded, reveal, color });
}
function resize() {
  const canvas = $("#shirt-canvas"),
    r = canvas.getBoundingClientRect(),
    dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  draw();
  stickerEditor?.sync();
}
new ResizeObserver(() => {
  if (view === "studio") resize();
}).observe($(".canvas-wrap"));
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $("#toast").classList.remove("show"), 4500);
}
function animate(targetFold, targetReveal, duration = 750, onDone) {
  cancelAnimationFrame(animationFrame);
  const start = performance.now(),
    initialFold = folded,
    initialReveal = reveal;
  animating = true;
  const tick = (now) => {
    const progress = reduced.matches
        ? 1
        : Math.min(1, (now - start) / duration),
      ease = progress * progress * (3 - 2 * progress);
    folded = initialFold + (targetFold - initialFold) * ease;
    reveal = initialReveal + (targetReveal - initialReveal) * ease;
    draw();
    if (progress < 1) animationFrame = requestAnimationFrame(tick);
    else {
      animating = false;
      onDone?.();
    }
  };
  animationFrame = requestAnimationFrame(tick);
}
function updateSteps() {
  const visibleStep = Math.min(step, 3);
  const levels = [
    "CHOOSE YOUR FOLD",
    "PLACE THREE BANDS",
    "ADD YOUR DYE",
    "READY TO REVEAL",
    "MASTERPIECE COMPLETE",
  ];
  document.querySelectorAll(".steps li").forEach((el, i) => {
    el.classList.toggle("active", i === visibleStep);
    el.classList.toggle("done", i < step);
    if (i === visibleStep) el.setAttribute("aria-current", "step");
    else el.removeAttribute("aria-current");
  });
  $("#quest-progress-copy").textContent =
    step > 3 ? "QUEST COMPLETE" : `LEVEL ${step + 1} OF 4`;
  $(".quest-meter").setAttribute("aria-valuenow", String(Math.min(step + 1, 4)));
  $("#quest-meter-fill").style.width = `${step > 3 ? 100 : (step + 1) * 25}%`;
  $("#bench-label-text").textContent = levels[Math.min(step, 4)];
}
function setCanvasLabel(text) {
  $("#shirt-canvas").setAttribute("aria-label", text);
}
function renderStep() {
  document.body.dataset.step = String(step);
  updateSteps();
  $("#reset-button").disabled = animating || saving;
  const content = $("#step-content");
  if (step === 0) {
    content.innerHTML = `<p class="step-kicker">LEVEL 1 · PICK A FOLD</p><h2>Choose your fold.</h2><p class="step-description">Every fold makes a different pattern. Pick the one that feels like you.</p><div class="fold-options">${FOLDS.map((f, i) => `<button class="fold-option ${shirt.fold === i ? "selected" : ""}" data-fold="${i}" aria-pressed="${shirt.fold === i}"><span class="fold-symbol fold-${i}" aria-hidden="true">${f.symbol}</span><span><strong>${f.short}</strong><small>${f.description}</small></span><span class="radio-dot"></span></button>`).join("")}</div><button id="next-button" class="button primary">Fold my shirt ${icon("arrow")}</button><p class="button-caption">No wrong choices. Every pattern is one of a kind.</p>`;
    content.querySelectorAll("[data-fold]").forEach((button) =>
      button.addEventListener("click", () => {
        shirt.fold = Number(button.dataset.fold);
        renderStep();
        draw();
      }),
    );
    $("#next-button").onclick = () => {
      if (!renderer || animating) return;
      step = 1;
      animate(1, 0, 900, () => {
        renderStep();
      });
      renderStep();
      $("#step-content").scrollTop = 0;
      $("#bench-hint").textContent = "One little bundle, ready for its bands.";
      setCanvasLabel(
        "Folded shirt. Click or press Enter to add a rubber band.",
      );
    };
  } else if (step === 1) {
    content.innerHTML = `<p class="step-kicker">LEVEL 2 · TIE IT TIGHT</p><h2>Place three bands.</h2><p class="step-description">Each band leaves a pale resist line in the final pattern. Drag them onto the shirt, or use the easy button below.</p><div class="band-visual" aria-label="${shirt.bands} of 3 rubber bands added">${[0, 1, 2].map((i) => `<button class="band-pick ${i < shirt.bands ? "used" : ""}" aria-label="Rubber band ${i + 1}. Drag to the shirt or tap to add." ${i < shirt.bands || animating ? "disabled" : ""}><span class="rubber-band"></span></button>`).join("")}<span class="band-count" aria-live="polite">${shirt.bands} of 3</span></div><div class="easy-actions"><button class="button secondary" id="add-band" ${shirt.bands >= 3 || animating ? "disabled" : ""}>${shirt.bands >= 3 ? "All snug and ready!" : `Add a rubber band · ${shirt.bands}/3`}</button><button class="button secondary" id="undo-band" ${!shirt.bands ? "disabled" : ""} aria-label="Undo last rubber band">Undo</button></div><button class="button primary" id="next-button" ${canAdvance(step, shirt) ? "" : "disabled"}>Bring on the dye ${icon("arrow")}</button>`;
    $("#add-band").onclick = () => tieBand();
    $("#undo-band").onclick = () => {
      shirt.bandPlacements.pop();
      shirt.bands = shirt.bandPlacements.length;
      renderStep();
      draw();
    };
    content.querySelectorAll(".band-pick").forEach(wireBandDrag);
    $("#next-button").onclick = () => {
      if (!canAdvance(step, shirt) || animating) return;
      step = 2;
      renderStep();
      $("#step-content").scrollTop = 0;
      $("#bench-hint").textContent =
        "Tap or drag on the fabric to add your dye.";
      setCanvasLabel(
        "Dye workspace. Tap or drag on the folded shirt. Keyboard: arrow keys move your dye point; Space adds dye.",
      );
    };
  } else if (step === 2) {
    content.innerHTML = `<p class="step-kicker">LEVEL 3 · MIX & DYE</p><h2>Make a little mess.</h2><p class="step-description">Mix secret colors, shades, and splash sizes. Everything stays gray until the reveal.</p><div class="dye-settings"><div class="dye-setting"><span>Secret color</span><div role="group" aria-label="Secret dye color">${["Dye A", "Dye B"].map((label, i) => `<button class="setting-choice family-${i} ${dyeFamily === i ? "selected" : ""}" data-family="${i}" aria-pressed="${dyeFamily === i}"><span aria-hidden="true">${i ? "B" : "A"}</span>${label}</button>`).join("")}</div></div><div class="dye-setting"><span>Splash size</span><div role="group" aria-label="Splash size">${["Fine", "Medium", "Bold"].map((label, i) => `<button class="setting-choice ${brush === i ? "selected" : ""}" data-brush="${i}" aria-pressed="${brush === i}">${label}</button>`).join("")}</div></div></div><div class="dye-bottles" role="group" aria-label="Secret dye shade">${["Soft", "Medium", "Deep"].map((label, i) => `<button class="dye-choice ${shade === i ? "selected" : ""}" data-shade="${i}" aria-pressed="${shade === i}" aria-label="${label} shade"><span class="bottle bottle-${i} family-${dyeFamily}"><span class="bottle-mark">${["Ⅰ", "Ⅱ", "Ⅲ"][i]}</span></span><strong>${label}</strong></button>`).join("")}</div><button class="button secondary easy-dye" id="help-dye">Surprise me with a mix ✧</button><div class="dye-progress"><span id="drop-count">${shirt.drops.length} little splashes</span><button class="text-button" id="undo-dye" ${!shirt.drops.length ? "disabled" : ""}>Undo</button></div><button class="button primary" id="next-button" ${canAdvance(step, shirt) ? "" : "disabled"}>Ready for the surprise ${icon("arrow")}</button><p class="button-caption" id="dye-caption">${shirt.drops.length < 3 ? "Add at least 3 splashes. Make it wonderfully you." : "Try both dyes or change the splash size for a one-of-a-kind pattern."}</p><p class="keyboard-help">Keyboard: arrow keys to aim, Space to squirt.</p>`;
    content.querySelectorAll("[data-family]").forEach(
      (button) =>
        (button.onclick = () => {
          dyeFamily = Number(button.dataset.family);
          renderStep();
        }),
    );
    content.querySelectorAll("[data-brush]").forEach(
      (button) =>
        (button.onclick = () => {
          brush = Number(button.dataset.brush);
          renderStep();
        }),
    );
    content.querySelectorAll("[data-shade]").forEach(
      (b) =>
        (b.onclick = () => {
          shade = Number(b.dataset.shade);
          renderStep();
        }),
    );
    $("#help-dye").onclick = () => {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2,
          r = 0.1 + Math.random() * 0.3;
        dyeAt(
          shirt.fold === 1
            ? { x: (Math.random() - 0.5) * 0.4, y: (Math.random() - 0.5) * 1.1 }
            : { x: Math.cos(a) * r, y: Math.sin(a) * r },
          {
            shade: Math.floor(Math.random() * 3),
            family: Math.floor(Math.random() * 2),
            brush: Math.floor(Math.random() * 3),
          },
        );
      }
    };
    $("#undo-dye").onclick = () => {
      shirt.drops.pop();
      renderStep();
      draw();
    };
    $("#next-button").onclick = () => {
      if (!canAdvance(step, shirt)) return;
      step = 3;
      renderStep();
      $("#step-content").scrollTop = 0;
      $("#bench-hint").textContent = "A tiny shirt. A very big moment.";
    };
  } else if (step === 3) {
    content.innerHTML = `<p class="step-kicker">FINAL LEVEL · THE BIG REVEAL</p><h2>Ready, little love?</h2><p class="step-description">Your shirt is finished, and it has been keeping a very special secret.</p><div class="final-level-card"><span class="mystery-token" aria-hidden="true">?</span><span><strong>Secret ready!</strong><small>Bring everyone close, then reveal together.</small></span><span class="level-check" aria-hidden="true">✓</span></div>${demo ? '<p class="demo-note">You’re in the demo studio. This is a sample reveal.</p>' : ""}<button class="button primary reveal-button" id="reveal-button">Unfold the surprise ${icon("arrow")}</button><p class="button-caption">Take a breath. This is the big moment.</p>`;
    $("#reveal-button").onclick = performReveal;
  } else {
    renderFinish(content);
  }
  stickerEditor.sync();
  if (!renderer || saving) {
    content
      .querySelectorAll("button, input")
      .forEach((button) => (button.disabled = true));
  }
}
function renderFinish(content) {
  const selected = shirt.stickers.find((s) => s.id === selectedSticker);
  content.innerHTML = `<div class="finish-heading"><p class="step-kicker">${demo ? "QUEST COMPLETE · PRACTICE MAKES LOVELY" : "QUEST COMPLETE · THE CLARK FAMILY IS GROWING"}</p><h2>${color === "pink" ? "It’s a girl!" : "It’s a boy!"}</h2><p class="step-description">${demo ? "A little practice, a whole lot of love." : "Our second little girl. Madison’s going to be a big sister!"}</p></div><div class="finish-tabs" role="tablist" aria-label="Finish your shirt"><button role="tab" id="decorate-tab" aria-controls="finish-panel" aria-selected="${finishTab === "decorate"}">1. Decorate</button><button role="tab" id="share-tab" aria-controls="finish-panel" aria-selected="${finishTab === "share"}">2. Save & share</button></div><div id="finish-panel" role="tabpanel" aria-labelledby="${finishTab === "decorate" ? "decorate-tab" : "share-tab"}"></div>`;
  $("#decorate-tab").onclick = () => {
    finishTab = "decorate";
    renderStep();
  };
  $("#share-tab").onclick = () => {
    finishTab = "share";
    renderStep();
  };
  const panel = $("#finish-panel");
  if (finishTab === "decorate") {
    panel.innerHTML = `<div class="sticker-palette" role="group" aria-label="Add stickers">${STICKERS.map((symbol) => `<button class="sticker-choice" data-symbol="${symbol}" aria-label="${STICKER_NAMES[symbol]} sticker" ${saved || shirt.stickers.length >= 8 ? "disabled" : ""}>${symbol}</button>`).join("")}<button class="random-stickers" id="random-stickers" ${saved || shirt.stickers.length >= 8 ? "disabled" : ""}>Surprise me ✧</button></div><p class="editor-instruction" id="editor-status" aria-live="polite">${shirt.stickers.length}/8 stickers · ${selected ? "Drag your sticker, or use the controls below." : "Tap a sticker to add it. Add a few, or keep it simple."}</p><div class="sticker-tools ${selected ? "" : "empty"}">${
      selected
        ? `<div class="size-control"><label for="sticker-size">Size</label><input id="sticker-size" type="range" min="12" max="32" step="1" value="${Math.round(selected.size * 100)}" ${saved ? "disabled" : ""}/><span id="sticker-size-label">${Math.round(selected.size * 100)}</span><button class="text-button" id="remove-sticker" ${saved ? "disabled" : ""}>Remove</button></div><div class="move-controls" role="group" aria-label="Move selected sticker"><span>Move</span>${[
            ["left", "←"],
            ["up", "↑"],
            ["down", "↓"],
            ["right", "→"],
          ]
            .map(
              ([dir, glyph]) =>
                `<button data-move="${dir}" aria-label="Move sticker ${dir}" ${saved ? "disabled" : ""}>${glyph}</button>`,
            )
            .join(
              "",
            )}<button class="center-sticker" id="center-sticker" ${saved ? "disabled" : ""}>Center</button></div>`
        : "<span>Just a little extra love. Stickers are optional.</span>"
    }</div><button class="button primary" id="finish-decorating">Save & share ${icon("arrow")}</button>`;
    panel.querySelectorAll("[data-symbol]").forEach(
      (button) =>
        (button.onclick = () => {
          const sticker = addSticker(shirt, button.dataset.symbol);
          if (sticker) selectedSticker = sticker.id;
          renderStep();
        }),
    );
    $("#random-stickers").onclick = () => {
      const count = Math.min(3, 8 - shirt.stickers.length);
      for (let i = 0; i < count; i++) {
        const sticker = addSticker(
          shirt,
          STICKERS[Math.floor(Math.random() * STICKERS.length)],
          true,
        );
        selectedSticker = sticker.id;
      }
      renderStep();
    };
    $("#finish-decorating").onclick = () => {
      finishTab = "share";
      renderStep();
      content.scrollTop = 0;
    };
    if (selected) {
      $("#sticker-size").oninput = (event) => {
        selected.size = Number(event.target.value) / 100;
        constrainSticker(selected);
        stickerEditor.sync();
        updateStickerSize();
      };
      panel.querySelectorAll("[data-move]").forEach(
        (button) =>
          (button.onclick = () => {
            const moves = {
              left: [-0.04, 0],
              right: [0.04, 0],
              up: [0, 0.04],
              down: [0, -0.04],
            };
            const [x, y] = moves[button.dataset.move];
            selected.x += x;
            selected.y += y;
            constrainSticker(selected);
            stickerEditor.sync();
          }),
      );
      $("#center-sticker").onclick = () => {
        selected.x = 0;
        selected.y = 0;
        stickerEditor.sync();
      };
      $("#remove-sticker").onclick = () => {
        shirt.stickers = shirt.stickers.filter((s) => s.id !== selectedSticker);
        selectedSticker = shirt.stickers.at(-1)?.id || null;
        renderStep();
      };
    }
  } else {
    panel.innerHTML = `<div class="name-fields"><div><label class="input-label" for="guest-name">Made by <span>optional</span></label><input id="guest-name" maxlength="32" placeholder="Your name" autocomplete="given-name" ${saved ? "disabled" : ""}/></div><div><label class="input-label" for="shirt-title">Give your tee a name <span>optional</span></label><input id="shirt-title" maxlength="48" placeholder="A little ray of sunshine" ${saved ? "disabled" : ""}/></div></div><button class="button primary" id="save-shirt" ${saved ? "disabled" : ""}>${icon("line")}${saved ? "Hanging with love!" : saving ? "Hanging your shirt…" : "Hang it on the clothesline"}</button><button class="button secondary" id="download-shirt">${icon("download")} Save my shirt</button><button class="text-button make-another-inline" id="make-another-inline">${icon("reset")} Make another shirt</button><p class="button-caption">${sharedGallery ? "A little hello from everyone who loves her." : "This clothesline is saved on this device."}</p>`;
    $("#guest-name").value = shirt.name;
    $("#shirt-title").value = shirt.title;
    $("#guest-name").oninput = (e) => (shirt.name = e.target.value);
    $("#shirt-title").oninput = (e) => (shirt.title = e.target.value);
    $("#save-shirt").onclick = hangShirt;
    $("#download-shirt").onclick = downloadShirt;
    $("#make-another-inline").onclick = startAnotherShirt;
  }
}
function updateStickerSize() {
  const sticker = shirt.stickers.find((s) => s.id === selectedSticker);
  if (sticker && $("#sticker-size")) {
    $("#sticker-size").value = Math.round(sticker.size * 100);
    $("#sticker-size-label").textContent = Math.round(sticker.size * 100);
  }
}
function wireBandDrag(button) {
  let dragged = false;
  button.onclick = () => {
    if (!dragged) tieBand();
  };
  button.onpointerdown = (event) => {
    if (animating || shirt.bands >= 3) return;
    dragged = false;
    const start = { x: event.clientX, y: event.clientY };
    let ghost;
    button.setPointerCapture(event.pointerId);
    button.onpointermove = (move) => {
      if (Math.hypot(move.clientX - start.x, move.clientY - start.y) > 8)
        dragged = true;
      if (!dragged) return;
      if (!ghost) {
        ghost = document.createElement("span");
        ghost.className = "band-ghost";
        ghost.setAttribute("aria-hidden", "true");
        document.body.append(ghost);
      }
      ghost.style.left = `${move.clientX}px`;
      ghost.style.top = `${move.clientY}px`;
      $(".workbench").classList.toggle(
        "drop-ready",
        renderer.contains(renderer.point(move), shirt.fold),
      );
    };
    const finish = (end, cancelled) => {
      button.onpointermove = null;
      ghost?.remove();
      $(".workbench").classList.remove("drop-ready");
      if (!cancelled && dragged) {
        const point = renderer.point(end);
        if (renderer.contains(point, shirt.fold)) tieBand(point);
        else
          notify(
            "Drop the band onto the folded shirt, or tap Add a rubber band.",
          );
      }
    };
    button.onpointerup = (end) => finish(end, false);
    button.onpointercancel = (end) => {
      dragged = true;
      finish(end, true);
    };
  };
}

function tieBand(point) {
  if (step !== 1 || animating || shirt.bands >= 3) return;
  addBand(shirt, point);
  renderStep();
  draw();
}
function dyeAt(point, options = {}) {
  if (step !== 2 || animating || !renderer.contains(point, shirt.fold)) return;
  const selectedShade = options.shade ?? shade;
  const selectedFamily = options.family ?? dyeFamily;
  const selectedBrush = options.brush ?? brush;
  if (
    addDrop(
      shirt,
      point.x,
      point.y,
      selectedShade,
      BRUSH_SIZES[selectedBrush],
      selectedFamily,
    )
  ) {
    draw();
    $("#drop-count").textContent = `${shirt.drops.length} little splashes`;
    $("#undo-dye").disabled = false;
    $("#next-button").disabled = !canAdvance(step, shirt);
    if (shirt.drops.length >= 3)
      $("#dye-caption").textContent =
        "Try another dye or splash size to make the pattern even more yours.";
  } else
    notify("Your tee is full of love! Undo a splash or get ready to reveal.");
}
let painting = false,
  lastPoint = null;
$("#shirt-canvas").addEventListener("pointerdown", (e) => {
  if (!renderer) return;
  if (step === 1) {
    tieBand();
    return;
  }
  if (step !== 2) return;
  painting = true;
  $("#shirt-canvas").setPointerCapture(e.pointerId);
  lastPoint = renderer.point(e);
  dyeAt(lastPoint);
});
$("#shirt-canvas").addEventListener("pointermove", (e) => {
  if (!painting || step !== 2) return;
  const p = renderer.point(e);
  if (
    Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y) >
    Math.max(0.032, BRUSH_SIZES[brush] * 0.4)
  ) {
    dyeAt(p);
    lastPoint = p;
  }
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("#shirt-canvas").addEventListener(event, () => (painting = false));
$("#shirt-canvas").addEventListener("keydown", (e) => {
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(
      e.key,
    )
  ) {
    e.preventDefault();
    if (step === 1 && (e.key === " " || e.key === "Enter")) tieBand();
    if (step !== 2) return;
    if (e.key === "ArrowLeft") keyboardPoint.x -= 0.07;
    if (e.key === "ArrowRight") keyboardPoint.x += 0.07;
    if (e.key === "ArrowUp") keyboardPoint.y += 0.07;
    if (e.key === "ArrowDown") keyboardPoint.y -= 0.07;
    keyboardPoint.x = Math.max(-0.45, Math.min(0.45, keyboardPoint.x));
    keyboardPoint.y = Math.max(-0.45, Math.min(0.45, keyboardPoint.y));
    if (e.key === " " || e.key === "Enter") dyeAt(keyboardPoint);
    else
      $("#bench-hint").textContent =
        `Dye aim: ${Math.round(keyboardPoint.x * 100)} across, ${Math.round(keyboardPoint.y * 100)} up. Space to squirt.`;
  }
});
function performReveal() {
  if (animating) return;
  animating = true;
  $("#reveal-button").disabled = true;
  $("#reveal-button").textContent = "A little secret is unfolding…";
  $("#reset-button").disabled = true;
  animate(0, 1, 2800, () => {
    step = 4;
    hasRevealed = true;
    renderStep();
    $("#step-content").scrollTop = 0;
    $("#reveal-badge").hidden = false;
    $("#reveal-kicker").textContent = demo
      ? "THE DEMO SURPRISE"
      : "MADISON IS GOING TO BE A BIG SISTER";
    $("#reveal-title").textContent =
      color === "pink" ? "Hello, baby girl!" : "Hello, baby boy!";
    $("#bench-hint").textContent = "One of a kind. Made by you, with love.";
    $(".workbench").classList.add("revealed", color);
    setCanvasLabel("Your finished tie-dye shirt, revealed in " + color + ".");
    celebrate();
  });
}
function celebrate() {
  if (reduced.matches) return;
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.cssText = `--x:${Math.random() * 100}vw;--delay:${Math.random() * 0.8}s;--turn:${Math.random() * 720}deg;--c:${[color === "pink" ? "#eb7197" : "#7eaaf3", "#d7ed58", "#fff5da"][i % 3]}`;
    document.body.append(piece);
    setTimeout(() => piece.remove(), 4400);
  }
}
function snapshot(size = 1000, forGallery = false) {
  const source = $("#shirt-canvas"),
    oldW = source.width,
    oldH = source.height;
  source.width = size;
  source.height = size;
  draw();
  const output = document.createElement("canvas");
  output.width = size;
  output.height = size * 1.18;
  const ctx = output.getContext("2d");
  if (!forGallery) {
    ctx.fillStyle = "#f7f5ed";
    ctx.fillRect(0, 0, output.width, output.height);
  }
  ctx.drawImage(source, 0, 0);
  paintStickers(ctx, shirt.stickers, size, size);
  ctx.textAlign = "center";
  ctx.fillStyle = "#34372c";
  ctx.font = `${size * 0.029}px Georgia`;
  ctx.fillText(
    shirt.title.trim() || "A little shirt. A whole lot of love.",
    size * 0.5,
    size * 0.99,
    size * 0.85,
  );
  ctx.font = `${size * 0.018}px sans-serif`;
  ctx.fillText(
    shirt.name.trim()
      ? `Made with love by ${shirt.name.trim()}`
      : "Made with love",
    size * 0.5,
    size * 1.035,
    size * 0.85,
  );
  ctx.fillStyle = "#747666";
  ctx.font = `600 ${size * 0.016}px sans-serif`;
  ctx.fillText(
    demo
      ? "A LITTLE SECRET · DEMO SHIRT"
      : "THE CLARK FAMILY · EST. 2021 · MADISON’S LITTLE SISTER",
    size * 0.5,
    size * 1.1,
  );
  source.width = oldW;
  source.height = oldH;
  draw();
  if (forGallery) {
    const cropped = document.createElement("canvas");
    cropped.width = size;
    cropped.height = Math.round(size * 0.875);
    cropped
      .getContext("2d")
      .drawImage(
        output,
        size * 0.1,
        size * 0.15,
        size * 0.8,
        size * 0.7,
        0,
        0,
        cropped.width,
        cropped.height,
      );
    return cropped;
  }
  return output;
}
function downloadShirt() {
  const a = document.createElement("a");
  a.download = `a-little-secret-${shirt.id.slice(0, 8)}.png`;
  a.href = snapshot().toDataURL("image/png");
  a.click();
  notify("Your little masterpiece is ready to keep.");
}
async function hangShirt() {
  if (saved || saving) return;
  saving = true;
  renderStep();
  try {
    const entry = {
      id: shirt.id,
      name: shirt.name.trim(),
      title: shirt.title.trim(),
      image: snapshot(420, true).toDataURL("image/png"),
      created_at: new Date().toISOString(),
    };
    await saveEntry(entry);
    saved = true;
    saving = false;
    renderStep();
    await refreshCount();
    notify(
      sharedGallery
        ? "Your shirt is on the family clothesline!"
        : "Your shirt is on this device’s clothesline!",
    );
    showGallery();
  } catch (error) {
    saving = false;
    renderStep();
    notify(error.message);
  }
}
async function refreshCount() {
  try {
    $("#gallery-count").textContent = (await getEntries()).length;
  } catch {
    /* Gallery errors are displayed in its full view. */
  }
}
function showStudio() {
  view = "studio";
  document.body.classList.remove("gallery-open");
  $("#gallery-view").hidden = true;
  $("#studio-view").hidden = false;
  $("#studio-nav").classList.add("active");
  $("#gallery-nav").classList.remove("active");
  resize();
}
function resetShirt() {
  cancelAnimationFrame(animationFrame);
  shirt = createShirt();
  shirtNumber += 1;
  step = 0;
  shade = 1;
  dyeFamily = 0;
  brush = 1;
  folded = 0;
  reveal = 0;
  saved = false;
  saving = false;
  animating = false;
  keyboardPoint = { x: 0, y: 0 };
  selectedSticker = null;
  finishTab = "decorate";
  $("#reveal-badge").hidden = true;
  $("#edition").textContent = `NO. ${String(shirtNumber).padStart(3, "0")}`;
  $(".workbench").classList.remove("revealed", "pink", "blue");
  $("#bench-hint").textContent = "Your blank canvas. So many possibilities.";
  setCanvasLabel("Your shirt. Choose a fold to get started.");
  renderStep();
  $("#step-content").scrollTop = 0;
  draw();
}
function startAnotherShirt() {
  if (!saved && step > 0) {
    $("#reset-dialog").showModal();
    return;
  }
  resetShirt();
  showStudio();
  notify("A fresh shirt is ready for you.");
}
async function showGallery() {
  view = "gallery";
  document.body.classList.add("gallery-open");
  $("#studio-view").hidden = true;
  $("#gallery-view").hidden = false;
  $("#studio-nav").classList.remove("active");
  $("#gallery-nav").classList.add("active");
  $("#gallery-description").textContent = sharedGallery
    ? "Every shirt, a little hello from someone who loves you."
    : "A little collection on this device. The family clothesline opens when shared gallery setup is complete.";
  const container = $("#gallery-items");
  container.innerHTML =
    '<p class="gallery-empty">Finding everyone’s little masterpieces…</p>';
  try {
    const entries = await getEntries();
    $("#gallery-count").textContent = entries.length;
    container.replaceChildren();
    if (!entries.length) {
      container.innerHTML =
        '<div class="gallery-empty"><span>♡</span><h2>A little space for a lot of love.</h2><p>Your shirt could be the first on the line.</p><button class="button primary" id="empty-create">Make a little masterpiece</button></div>';
      $("#empty-create").onclick = showStudio;
      return;
    }
    for (const entry of entries) {
      const card = document.createElement("article");
      card.className = "gallery-shirt";
      const img = document.createElement("img");
      img.src = entry.image;
      img.alt = entry.title || "A handmade tie-dye shirt";
      img.loading = "lazy";
      const title = document.createElement("h3");
      title.textContent = entry.title || "A little masterpiece";
      const name = document.createElement("p");
      name.textContent = entry.name
        ? `Made by ${entry.name}`
        : "Made with love";
      const pins = document.createElement("span");
      pins.className = "clothespins";
      pins.setAttribute("aria-hidden", "true");
      card.append(img, pins, title, name);
      container.append(card);
    }
  } catch (error) {
    container.replaceChildren();
    const message = document.createElement("p");
    message.className = "gallery-empty";
    message.textContent = error.message;
    container.append(message);
  }
}
$("#gallery-nav").onclick = () => {
  if (!hasRevealed) $("#spoiler-dialog").showModal();
  else showGallery();
};
$("#spoiler-dialog").addEventListener("close", () => {
  if ($("#spoiler-dialog").returnValue === "peek") {
    hasRevealed = true;
    showGallery();
  }
});
$("#studio-nav").onclick = showStudio;
$(".brand").onclick = (e) => {
  e.preventDefault();
  showStudio();
};
$("#back-to-studio").onclick = showStudio;
$("#new-shirt").onclick = startAnotherShirt;
$("#refresh-gallery").onclick = showGallery;
$("#reset-button").onclick = () => $("#reset-dialog").showModal();
$("#reset-dialog").addEventListener("close", () => {
  if ($("#reset-dialog").returnValue !== "reset") return;
  resetShirt();
  showStudio();
});
$("#shirt-canvas").addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  notify("The studio paused. Reload this page to restore the canvas.");
  $("#canvas-error").hidden = false;
});
renderStep();
resize();
refreshCount();
