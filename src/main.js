import "./style.css";
import { FOLDS, STICKERS, createShirt, addDrop, canAdvance } from "./model.js";
import { ShirtRenderer } from "./renderer.js";
import { getEntries, saveEntry, sharedGallery } from "./gallery.js";
const configured = import.meta.env.VITE_REVEAL;
const demo = !["pink", "blue"].includes(configured);
const color = demo ? "blue" : configured;
let shirt = createShirt(),
  step = 0,
  shade = 1,
  folded = 0,
  reveal = 0,
  animating = false,
  saved = false,
  hasRevealed = false,
  view = "studio";
let renderer,
  animationFrame,
  keyboardPoint = { x: 0, y: 0 };
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
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
<header class="header"><a class="brand" href="#" aria-label="A little secret home"><span class="brand-flower">✳</span><span>a little secret<span class="brand-dot">.</span></span></a><nav aria-label="Main navigation"><button class="nav-link active" id="studio-nav">${icon("shirt")} The dye studio</button><button class="nav-link" id="gallery-nav">${icon("line")} The clothesline <span class="count" id="gallery-count">0</span></button></nav><span class="header-note">made with love, for our little love ${icon("heart")}</span></header>
<main>
<section id="studio-view">
<div class="intro"><div><p class="eyebrow">A LITTLE DYE. A BIG SURPRISE.</p><h1>Something little. <br>Something <em>lovely.</em></h1><p class="intro-copy">Make a tie-dye tee. Unfold a little secret. <br>A one-of-a-kind hello to our newest little love.</p></div><div class="intro-stamp"><span>OH, BABY!</span><strong>Made<br>with love</strong><span>ONE TINY TEE AT A TIME</span></div></div>
<div class="workspace">
<section class="workbench" aria-label="Interactive tie-dye workspace"><div class="bench-top"><span class="bench-label"><span class="status-dot"></span> YOUR LITTLE MASTERPIECE</span><span id="edition">NO. 001</span></div><div class="canvas-wrap"><canvas id="shirt-canvas" width="1100" height="1000" tabindex="0" role="img" aria-label="Your shirt. Choose a fold to get started."></canvas><div id="shirt-sticker" aria-hidden="true"></div><span class="side-note">a little messy is a little magic</span><div class="reveal-badge" id="reveal-badge" hidden><span id="reveal-kicker"></span><strong id="reveal-title"></strong></div><div class="canvas-error" id="canvas-error" hidden><strong>Let’s get the studio ready.</strong><p>This game needs WebGL. Try a browser with hardware acceleration enabled.</p></div></div><div class="bench-bottom"><span id="bench-hint">Your blank canvas. So many possibilities.</span><button class="text-button" id="reset-button">${icon("reset")} Start over</button></div></section>
<aside class="controls"><ol class="steps" aria-label="Your progress"><li class="active"><span>1</span>Fold</li><li><span>2</span>Tie</li><li><span>3</span>Dye</li><li><span>4</span>Reveal</li></ol><div id="step-content"></div><div class="secret-note">${icon("heart")}<p>A little secret, kept under wraps.<br><span>Everything stays gray until the big reveal.</span></p></div></aside>
</div>
<div class="under-workspace"><span>NO TWO SHIRTS ALIKE. JUST LIKE NO LOVE QUITE LIKE THIS.</span><span>Fold it. Dye it. Feel all the feelings. <span class="tiny-flower">✳</span></span></div>
</section>
<section id="gallery-view" hidden><div class="gallery-heading"><p class="eyebrow">A WHOLE LOT OF LOVE, HUNG UP TO DRY.</p><h1>Our little <em>clothesline.</em></h1><p id="gallery-description"></p><button class="button secondary" id="back-to-studio">${icon("shirt")} Back to my shirt</button></div><div id="gallery-items" class="clothesline"></div><button class="text-button gallery-refresh" id="refresh-gallery">${icon("reset")} Refresh the clothesline</button></section>
</main><footer><span>a little secret<span class="brand-dot">.</span></span><p>Little shirt. Big love.</p><span id="demo-label">${demo ? "DEMO STUDIO · SAMPLE REVEAL" : "MADE FOR OUR FAVORITE PEOPLE"}</span></footer>
<div id="toast" role="status" aria-live="polite"></div>
<dialog id="reset-dialog"><form method="dialog"><span class="dialog-flower">✳</span><h2>A fresh little start?</h2><p>Your current shirt will be cleared. Download it or hang it up first if you want to keep it.</p><div class="dialog-actions"><button value="cancel" class="button secondary">Keep this shirt</button><button value="reset" class="button primary">Start fresh ${icon("arrow")}</button></div></form></dialog>
<dialog id="spoiler-dialog"><form method="dialog"><span class="dialog-flower">♡</span><h2>There’s a secret on the line.</h2><p>The finished shirts give away the surprise. Make your own first, or peek if you’re ready!</p><div class="dialog-actions"><button value="cancel" class="button primary">Make my shirt</button><button value="peek" class="button secondary">Take a peek</button></div></form></dialog>`;
try {
  renderer = new ShirtRenderer($("#shirt-canvas"));
} catch (error) {
  console.error(error);
  $("#canvas-error").hidden = false;
}
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
  document.querySelectorAll(".steps li").forEach((el, i) => {
    el.classList.toggle("active", i === Math.min(step, 3));
    el.classList.toggle("done", i < step);
    if (i === Math.min(step, 3)) el.setAttribute("aria-current", "step");
    else el.removeAttribute("aria-current");
  });
}
function setCanvasLabel(text) {
  $("#shirt-canvas").setAttribute("aria-label", text);
}
function renderStep() {
  updateSteps();
  $("#reset-button").disabled = animating;
  const content = $("#step-content");
  if (step === 0) {
    content.innerHTML = `<p class="step-kicker">STEP 01 · MAKE IT YOURS</p><h2>Let’s roll with it.</h2><p class="step-description">Every fold has a little personality.<br>Which one feels like you?</p><div class="fold-options">${FOLDS.map((f, i) => `<button class="fold-option ${shirt.fold === i ? "selected" : ""}" data-fold="${i}" aria-pressed="${shirt.fold === i}"><span class="fold-symbol fold-${i}" aria-hidden="true">${f.symbol}</span><span><strong>${f.short}</strong><small>${f.description}</small></span><span class="radio-dot"></span></button>`).join("")}</div><button id="next-button" class="button primary">Fold my shirt ${icon("arrow")}</button><p class="button-caption">No wrong choices. Only happy accidents.</p>`;
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
      $("#bench-hint").textContent = "One little bundle, ready for its bands.";
      setCanvasLabel(
        "Folded shirt. Click or press Enter to add a rubber band.",
      );
    };
  } else if (step === 1) {
    content.innerHTML = `<p class="step-kicker">STEP 02 · HOLD IT TOGETHER</p><h2>All tied up.</h2><p class="step-description">Wrap three rubber bands around your bundle. Those little lines make the magic.</p><div class="band-visual" aria-label="${shirt.bands} of 3 rubber bands added">${[0, 1, 2].map((i) => `<span class="rubber-band ${i < shirt.bands ? "used" : ""}"></span>`).join("")}</div><button class="button secondary" id="add-band" ${shirt.bands >= 3 || animating ? "disabled" : ""}>${shirt.bands >= 3 ? "All snug and ready!" : `Add a rubber band · ${shirt.bands}/3`}</button><button class="button primary" id="next-button" ${canAdvance(step, shirt) ? "" : "disabled"}>Bring on the dye ${icon("arrow")}</button><p class="button-caption">You can also tap your shirt to tie it.</p>`;
    $("#add-band").onclick = tieBand;
    $("#next-button").onclick = () => {
      if (!canAdvance(step, shirt) || animating) return;
      step = 2;
      renderStep();
      $("#bench-hint").textContent =
        "Tap or drag on the fabric to add your dye.";
      setCanvasLabel(
        "Dye workspace. Tap or drag on the folded shirt. Keyboard: arrow keys move your dye point; Space adds dye.",
      );
    };
  } else if (step === 2) {
    content.innerHTML = `<p class="step-kicker">STEP 03 · A HAPPY LITTLE MESS</p><h2>A splash of mystery.</h2><p class="step-description">Pick a secret shade, then squirt it onto your shirt. Where it lands changes everything.</p><div class="dye-bottles" role="group" aria-label="Secret dye shade">${["Soft", "Medium", "Deep"].map((label, i) => `<button class="dye-choice ${shade === i ? "selected" : ""}" data-shade="${i}" aria-pressed="${shade === i}" aria-label="${label} dye"><span class="bottle bottle-${i}"><span class="bottle-mark">${["Ⅰ", "Ⅱ", "Ⅲ"][i]}</span></span><strong>${label}</strong></button>`).join("")}</div><div class="dye-progress"><span id="drop-count">${shirt.drops.length} little splashes</span><button class="text-button" id="undo-dye" ${!shirt.drops.length ? "disabled" : ""}>Undo</button></div><button class="button primary" id="next-button" ${canAdvance(step, shirt) ? "" : "disabled"}>Ready for the surprise ${icon("arrow")}</button><p class="button-caption" id="dye-caption">${shirt.drops.length < 3 ? "Add at least 3 splashes. Make it wonderfully you." : "A little white space makes a lovely pattern, too."}</p><p class="keyboard-help">Keyboard: arrow keys to aim, Space to squirt.</p>`;
    content.querySelectorAll("[data-shade]").forEach(
      (b) =>
        (b.onclick = () => {
          shade = Number(b.dataset.shade);
          renderStep();
        }),
    );
    $("#undo-dye").onclick = () => {
      shirt.drops.pop();
      renderStep();
      draw();
    };
    $("#next-button").onclick = () => {
      if (!canAdvance(step, shirt)) return;
      step = 3;
      renderStep();
      $("#bench-hint").textContent = "A tiny shirt. A very big moment.";
    };
  } else if (step === 3) {
    content.innerHTML = `<p class="step-kicker">STEP 04 · THE BIG LITTLE MOMENT</p><h2>Ready, little love?</h2><p class="step-description">Your masterpiece has been keeping a secret. It’s time to let it unfold.</p><div class="reveal-heart">♡<span>made with<br>so much love</span></div>${demo ? '<p class="demo-note">You’re in the demo studio. This is a sample reveal.</p>' : ""}<button class="button primary reveal-button" id="reveal-button">Unfold the surprise ${icon("heart")}</button><p class="button-caption">Gather your favorite people. Take a little breath.</p>`;
    $("#reveal-button").onclick = performReveal;
  } else {
    content.innerHTML = `<p class="step-kicker">${demo ? "A LITTLE DEMO. A LOT OF LOVE." : "OUR NEWEST LITTLE LOVE"}</p><h2>${color === "pink" ? "It’s a girl!" : "It’s a boy!"}</h2><p class="step-description">A little ${color}, a whole lot of love.<br>This one’s yours. Give it a finishing touch.</p><label class="input-label" for="guest-name">Made by <span>optional</span></label><input id="guest-name" maxlength="32" placeholder="Your name" autocomplete="given-name"/><label class="input-label" for="shirt-title">Give your tee a name <span>optional</span></label><input id="shirt-title" maxlength="48" placeholder="e.g. A little ray of sunshine"/><div class="sticker-row" role="group" aria-label="Shirt sticker"><span>A little extra</span><button class="sticker-choice ${!shirt.sticker ? "selected" : ""}" data-sticker="" aria-label="No sticker" aria-pressed="${!shirt.sticker}">∅</button>${STICKERS.map((s) => `<button class="sticker-choice ${shirt.sticker === s ? "selected" : ""}" data-sticker="${s}" aria-label="${{ "✿": "Flower", "♡": "Heart", "★": "Star", "☀": "Sun" }[s]} sticker" aria-pressed="${shirt.sticker === s}">${s}</button>`).join("")}</div><button class="button primary" id="save-shirt" ${saved ? "disabled" : ""}>${icon("line")}${saved ? "Hanging with love!" : "Hang it on the clothesline"}</button><button class="button secondary" id="download-shirt">${icon("download")} Save my shirt</button><p class="button-caption">${sharedGallery ? "Share a little love with everyone celebrating." : "This clothesline is saved on this device."}</p>`;
    $("#guest-name").value = shirt.name;
    $("#shirt-title").value = shirt.title;
    $("#guest-name").oninput = (e) => (shirt.name = e.target.value);
    $("#shirt-title").oninput = (e) => (shirt.title = e.target.value);
    content.querySelectorAll("[data-sticker]").forEach(
      (b) =>
        (b.onclick = () => {
          shirt.sticker = b.dataset.sticker;
          $("#shirt-sticker").textContent = shirt.sticker;
          renderStep();
        }),
    );
    $("#download-shirt").onclick = downloadShirt;
    $("#save-shirt").onclick = hangShirt;
    if (saved) {
      $("#guest-name").disabled = true;
      $("#shirt-title").disabled = true;
      content
        .querySelectorAll("[data-sticker]")
        .forEach((b) => (b.disabled = true));
    }
  }
  if (!renderer) {
    content
      .querySelectorAll("button")
      .forEach((button) => (button.disabled = true));
  }
}
function tieBand() {
  if (step !== 1 || animating || shirt.bands >= 3) return;
  shirt.bands++;
  renderStep();
  draw();
}
function dyeAt(point) {
  if (step !== 2 || animating || !renderer.contains(point, shirt.fold)) return;
  if (addDrop(shirt, point.x, point.y, shade, 0.16 + Math.random() * 0.09)) {
    draw();
    $("#drop-count").textContent = `${shirt.drops.length} little splashes`;
    $("#undo-dye").disabled = false;
    $("#next-button").disabled = !canAdvance(step, shirt);
    if (shirt.drops.length >= 3)
      $("#dye-caption").textContent =
        "A little white space makes a lovely pattern, too.";
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
  if (Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y) > 0.075) {
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
  shirt.bands = 0;
  animate(0, 1, 2800, () => {
    step = 4;
    hasRevealed = true;
    renderStep();
    $("#reveal-badge").hidden = false;
    $("#reveal-kicker").textContent = demo
      ? "THE DEMO SURPRISE"
      : "OUR LITTLE SECRET IS OUT";
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
  if (shirt.sticker) {
    ctx.fillStyle = "#fffaf2";
    ctx.strokeStyle = "#34372c";
    ctx.lineWidth = size * 0.0015;
    ctx.textAlign = "center";
    ctx.font = `${size * 0.08}px Georgia`;
    ctx.fillText(shirt.sticker, size * 0.5, size * 0.54);
    ctx.strokeText(shirt.sticker, size * 0.5, size * 0.54);
  }
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
  ctx.font = `${size * 0.013}px sans-serif`;
  ctx.fillText(
    demo ? "A LITTLE SECRET · DEMO SHIRT" : "A LITTLE SECRET · OUR LITTLE LOVE",
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
    cropped.getContext("2d").drawImage(output, size * 0.1, size * 0.15, size * 0.8, size * 0.7, 0, 0, cropped.width, cropped.height);
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
  const button = $("#save-shirt");
  button.disabled = true;
  button.textContent = "Finding a little spot…";
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
    renderStep();
    await refreshCount();
    notify(
      sharedGallery
        ? "Your shirt is on the family clothesline!"
        : "Your shirt is on this device’s clothesline!",
    );
    showGallery();
  } catch (error) {
    notify(error.message);
    button.disabled = false;
    button.innerHTML = `${icon("line")} Try hanging it again`;
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
  $("#gallery-view").hidden = true;
  $("#studio-view").hidden = false;
  $("#studio-nav").classList.add("active");
  $("#gallery-nav").classList.remove("active");
  resize();
}
async function showGallery() {
  view = "gallery";
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
$("#refresh-gallery").onclick = showGallery;
$("#reset-button").onclick = () => $("#reset-dialog").showModal();
$("#reset-dialog").addEventListener("close", () => {
  if ($("#reset-dialog").returnValue !== "reset") return;
  cancelAnimationFrame(animationFrame);
  shirt = createShirt();
  step = 0;
  shade = 1;
  folded = 0;
  reveal = 0;
  saved = false;
  animating = false;
  keyboardPoint = { x: 0, y: 0 };
  $("#shirt-sticker").textContent = "";
  $("#reveal-badge").hidden = true;
  $(".workbench").classList.remove("revealed", "pink", "blue");
  $("#bench-hint").textContent = "Your blank canvas. So many possibilities.";
  setCanvasLabel("Your shirt. Choose a fold to get started.");
  renderStep();
  draw();
});
$("#shirt-canvas").addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  notify("The studio paused. Reload this page to restore the canvas.");
  $("#canvas-error").hidden = false;
});
renderStep();
resize();
refreshCount();
