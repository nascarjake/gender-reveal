import { test, expect } from "@playwright/test";
async function makeShirt(page, fold = "Spiral") {
  await page.goto("/?ui=v1");
  await page
    .getByRole("button", { name: new RegExp("^" + fold + " ") })
    .click();
  await page.getByRole("button", { name: "Fold my shirt" }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: /Add a rubber band/ }).click();
  await page.getByRole("button", { name: "Bring on the dye" }).click();
  const canvas = page.locator("#shirt-canvas");
  const box = await canvas.boundingBox();
  for (const [x, y] of [
    [0.5, 0.42],
    [0.56, 0.49],
    [0.44, 0.57],
    [0.52, 0.64],
    [0.47, 0.34],
  ])
    await canvas.click({ position: { x: box.width * x, y: box.height * y } });
  return canvas;
}
test("complete game: WebGL, reveal, customization, download, gallery persistence", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const canvas = await makeShirt(page);
  await page.getByRole("button", { name: "Dye B", exact: true }).click();
  await page.getByRole("button", { name: "Fine", exact: true }).click();
  const detailBox = await canvas.boundingBox();
  await canvas.click({
    position: { x: detailBox.width * 0.61, y: detailBox.height * 0.55 },
  });
  await expect(page.locator("#canvas-error")).toBeHidden();
  await expect(page.locator("#drop-count")).toHaveText("6 little splashes");
  const before = await canvas.evaluate((c) => {
    const gl = c.getContext("webgl"),
      p = new Uint8Array(c.width * c.height * 4);
    gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, p);
    let chroma = 0,
      opaque = 0;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] > 250) {
        opaque++;
        chroma += Math.abs(p[i] - p[i + 2]);
      }
    }
    return { chroma: chroma / opaque, opaque };
  });
  expect(before.opaque).toBeGreaterThan(10000);
  expect(before.chroma).toBeLessThan(12);
  await page.getByRole("button", { name: "Ready for the surprise" }).click();
  await page.getByRole("button", { name: "Unfold the surprise" }).click();
  await expect(
    page.getByRole("heading", { name: "It’s a girl!" }),
  ).toBeVisible();
  const after = await canvas.evaluate((c) => {
    const gl = c.getContext("webgl"),
      p = new Uint8Array(c.width * c.height * 4);
    gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, p);
    let chroma = 0,
      opaque = 0;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] > 250) {
        opaque++;
        chroma += Math.abs(p[i] - p[i + 2]);
      }
    }
    return chroma / opaque;
  });
  expect(after).toBeGreaterThan(20);
  await page
    .getByRole("button", { name: "Flower sticker", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Heart sticker", exact: true })
    .click();
  await expect(page.locator(".placed-sticker")).toHaveCount(2);
  await page.getByRole("button", { name: "Save & share", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Wanna build more tie-dye/ }),
  ).toHaveAttribute("href", "https://nascarjake.github.io/tie-dye-studio/");
  await page.getByLabel("Made by").fill("Auntie Test");
  await page.getByLabel("Give your tee a name").fill("Sunshine & love");
  await page.screenshot({
    path: "/tmp/little-secret-revealed.png",
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save my shirt", exact: true })
    .click();
  const keepsake = await download;
  expect(keepsake.suggestedFilename()).toMatch(/\.png$/);
  await keepsake.saveAs("/tmp/clark-keepsake.png");
  await page
    .getByRole("button", { name: "Hang it on the clothesline" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sunshine & love" }),
  ).toBeVisible();
  await expect(page.getByText("Made by Auntie Test")).toBeVisible();
  const edition = await page.locator("#edition").textContent();
  const nextEdition = Number(edition.match(/\d+/)[0]) + 1;
  await page.getByRole("button", { name: "Make another shirt" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose your fold." }),
  ).toBeVisible();
  await expect(page.locator("#edition")).toHaveText(
    `NO. ${String(nextEdition).padStart(3, "0")}`,
  );
  await page.reload();
  await page.getByRole("button", { name: /The clothesline/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Take a peek" }).click();
  await expect(
    page.getByRole("heading", { name: "Sunshine & love" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("a blank shirt uses the next clothesline number", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "little-secret-gallery-v1-pink",
      JSON.stringify(
        ["a", "b", "c"].map((id) => ({
          id,
          image: "data:image/png;base64,AA==",
          name: "Family",
          title: "A little masterpiece",
        })),
      ),
    );
  });
  await page.goto("/?ui=v1");
  await expect(page.locator("#gallery-count")).toHaveText("3");
  await expect(page.locator("#edition")).toHaveText("NO. 004");
});
test("mobile save uses the native file share handoff", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 2,
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: ({ files }) => Array.isArray(files) && files.length === 1,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: ({ files }) => {
        window.__sharedShirt = { name: files[0].name, type: files[0].type };
        return Promise.resolve();
      },
    });
  });
  await makeShirt(page);
  await page.getByRole("button", { name: "Ready for the surprise" }).click();
  await page.getByRole("button", { name: "Unfold the surprise" }).click();
  await page.getByRole("button", { name: "Save & share", exact: true }).click();
  await page.getByRole("button", { name: "Save / share my shirt", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__sharedShirt))
    .toEqual({ name: expect.stringMatching(/^a-little-secret-.*\.png$/), type: "image/png" });
});
test("the dye map accepts 800 splashes without increasing shader work", async ({
  page,
}) => {
  await makeShirt(page);
  const canvas = page.locator("#shirt-canvas");
  const elapsed = await canvas.evaluate((element) => {
    // The regular pointer path is intentional: it exercises the same UI and
    // WebGL upload work a guest uses, without making this test wait for 800
    // individual automation round trips.
    element.setPointerCapture = () => {};
    const bounds = element.getBoundingClientRect();
    const start = performance.now();
    for (let index = 0; index < 800; index++) {
      const angle = index * 2.399963229728653;
      const radius = 0.06 + ((index % 11) / 11) * 0.18;
      element.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: index + 1,
          clientX: bounds.left + bounds.width * (0.5 + Math.cos(angle) * radius),
          clientY: bounds.top + bounds.height * (0.5 + Math.sin(angle) * radius),
        }),
      );
    }
    return performance.now() - start;
  });
  await expect(page.locator("#drop-count")).toHaveText("800 little splashes");
  expect(elapsed).toBeLessThan(8000);
  await expect(page.getByRole("button", { name: "Ready for the surprise" })).toBeEnabled();
});
for (const fold of [
  "Accordion",
  "Scrunch",
  "Sunburst",
  "Chevron",
  "Pebble",
])
  test(`${fold}: tie, dye, undo, reveal and reset`, async ({ page }) => {
    await makeShirt(page, fold);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator("#drop-count")).toHaveText("4 little splashes");
    await page.getByRole("button", { name: "Ready for the surprise" }).click();
    await page.getByRole("button", { name: "Unfold the surprise" }).click();
    await expect(
      page.getByRole("heading", { name: "It’s a girl!" }),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/little-secret-${fold.toLowerCase()}-reveal.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Start fresh" }).click();
    await expect(
      page.getByRole("heading", { name: "Choose your fold." }),
    ).toBeVisible();
  });
test("six fold options can be selected before starting a shirt", async ({
  page,
}) => {
  await page.goto("/?ui=v1");
  await expect(page.locator(".fold-option")).toHaveCount(6);
  for (const fold of [
    "Spiral",
    "Accordion",
    "Scrunch",
    "Sunburst",
    "Chevron",
    "Pebble",
  ]) {
    const option = page.locator("[data-fold]", { hasText: fold });
    await option.click();
    await expect(option).toHaveAttribute("aria-pressed", "true");
  }
});
test("mobile layout has no horizontal overflow and keyboard can finish dye step", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?ui=v1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/little-secret-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Fold my shirt" }).click();
  const canvas = page.locator("#shirt-canvas");
  await expect(page.locator("#add-band")).toBeEnabled();
  await canvas.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bring on the dye" }).click();
  await canvas.focus();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space");
  }
  await expect(
    page.getByRole("button", { name: "Ready for the surprise" }),
  ).toBeEnabled();
});
test("initial studio visual", async ({ page }) => {
  await page.goto("/?ui=v1");
  await page.screenshot({
    path: "/tmp/little-secret-desktop.png",
    fullPage: true,
  });
});

async function revealWithButtons(page) {
  await page.goto("/?ui=v1");
  await expect(
    page.getByText("Madison’s going to be a big sister!", { exact: false }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Fold my shirt" }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: /Add a rubber band/ }).click();
  await page.getByRole("button", { name: "Bring on the dye" }).click();
  await page.getByRole("button", { name: "Surprise me with a mix" }).click();
  await page.getByRole("button", { name: "Ready for the surprise" }).click();
  await page.getByRole("button", { name: "Unfold the surprise" }).click();
  await expect(
    page.getByRole("heading", { name: "It’s a girl!" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Our second little girl. Madison’s going to be a big sister!",
    ),
  ).toBeVisible();
}
async function drag(page, source, target) {
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 15 });
  await page.mouse.up();
}
test("rubber bands can be dragged onto fabric; misses do not add bands", async ({
  page,
}) => {
  await page.goto("/?ui=v1");
  await page.getByRole("button", { name: "Fold my shirt" }).click();
  await expect(page.locator("#add-band")).toBeEnabled();
  const band = page.locator(".band-pick:not(:disabled)").first();
  let b = await band.boundingBox();
  await drag(
    page,
    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
    { x: 12, y: 12 },
  );
  await expect(page.locator(".band-count")).toHaveText("0 of 3");
  b = await band.boundingBox();
  const c = await page.locator("#shirt-canvas").boundingBox();
  await drag(
    page,
    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
    { x: c.x + c.width / 2 + 35, y: c.y + c.height / 2 + 20 },
  );
  await expect(page.locator(".band-count")).toHaveText("1 of 3");
  await page.getByRole("button", { name: "Undo last rubber band" }).click();
  await expect(page.locator(".band-count")).toHaveText("0 of 3");
  await expect(page.locator(".band-ghost")).toHaveCount(0);
});
test("multiple stickers support drag, size, keyboard movement, random additions, and removal", async ({
  page,
}) => {
  await revealWithButtons(page);
  await page
    .getByRole("button", { name: "Flower sticker", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Heart sticker", exact: true })
    .click();
  const sticker = page.locator(".placed-sticker").last();
  const b = await sticker.boundingBox();
  await drag(
    page,
    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
    { x: b.x + b.width / 2 + 45, y: b.y + b.height / 2 - 25 },
  );
  const after = await sticker.boundingBox();
  expect(after.x).toBeGreaterThan(b.x + 25);
  await page.getByLabel("Size", { exact: true }).fill("30");
  expect(
    await sticker.evaluate((el) =>
      parseFloat(el.style.getPropertyValue("--sticker-size")),
    ),
  ).toBeGreaterThan(60);
  const beforeKey = await sticker.boundingBox();
  await sticker.focus();
  await page.keyboard.press("ArrowLeft");
  const afterKey = await sticker.boundingBox();
  expect(afterKey.x).toBeLessThan(beforeKey.x);
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.locator(".placed-sticker")).toHaveCount(1);
  await page.getByRole("button", { name: "Surprise me" }).click();
  await expect(page.locator(".placed-sticker")).toHaveCount(4);
  await page.getByRole("button", { name: "Surprise me" }).click();
  await page.getByRole("button", { name: "Surprise me" }).click();
  await expect(page.locator(".placed-sticker")).toHaveCount(8);
  await expect(
    page.getByRole("button", { name: "Surprise me" }),
  ).toBeDisabled();
});
for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 820, height: 1180 },
  { width: 844, height: 390 },
]) {
  test(`mobile controls and shirt stay together at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?ui=v1");
    async function inView(selector) {
      const box = await page.locator(selector).boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    await inView("#shirt-canvas");
    await inView("#next-button");
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(viewport.height + 1);
    await page.getByRole("button", { name: "Fold my shirt" }).click();
    for (let i = 0; i < 3; i++)
      await page.getByRole("button", { name: /Add a rubber band/ }).click();
    await page.getByRole("button", { name: "Bring on the dye" }).click();
    await inView("#shirt-canvas");
    await inView(".dye-bottles");
    await inView("#help-dye");
    await page.screenshot({
      path: `/tmp/clark-dye-${viewport.width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Surprise me with a mix" })
      .click();
    await page.getByRole("button", { name: "Ready for the surprise" }).click();
    await page.getByRole("button", { name: "Unfold the surprise" }).click();
    await page.getByRole("button", { name: "Surprise me" }).click();
    await inView("#shirt-canvas");
    await inView(".sticker-palette");
    await page.screenshot({
      path: `/tmp/clark-stickers-${viewport.width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Save & share", exact: true })
      .click();
    await page.getByLabel("Made by").fill("Family");
    await inView("#shirt-canvas");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
  });
}

test("touch drag places a band on a phone without scrolling the page", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5174/?ui=v1");
  await page.getByRole("button", { name: "Fold my shirt" }).tap();
  await expect(page.locator("#add-band")).toBeEnabled();
  const band = await page
    .locator(".band-pick:not(:disabled)")
    .first()
    .boundingBox();
  const canvas = await page.locator("#shirt-canvas").boundingBox();
  const from = { x: band.x + band.width / 2, y: band.y + band.height / 2 },
    to = {
      x: canvas.x + canvas.width / 2 + 12,
      y: canvas.y + canvas.height / 2,
    };
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [from],
  });
  for (let i = 1; i <= 12; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * i) / 12,
          y: from.y + ((to.y - from.y) * i) / 12,
        },
      ],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".band-count")).toHaveText("1 of 3");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await context.close();
});

test("v2 uses a full-screen mobile game stage while preserving the game flow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/ui-v2/);
  const intro = page.getByRole("dialog", {
    name: "The Clark family is expecting another blessing in 2027.",
  });
  await expect(intro).toBeVisible();
  await expect(
    intro.getByText("Let’s play a game to find out what we’re having!"),
  ).toBeVisible();
  const introBox = await intro.locator(".game-intro-card").boundingBox();
  expect(introBox.y).toBeGreaterThanOrEqual(0);
  expect(introBox.y + introBox.height).toBeLessThanOrEqual(844);
  expect(Math.abs(introBox.y + introBox.height / 2 - 844 / 2)).toBeLessThan(2);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(844);
  await intro.getByRole("button", { name: "Let’s play" }).click();
  await expect(intro).toBeHidden();
  const stage = await page.locator(".workbench").boundingBox();
  const shirt = await page.locator("#shirt-canvas").boundingBox();
  const tray = await page.locator(".controls").boundingBox();
  expect(stage.width).toBeGreaterThanOrEqual(389);
  expect(stage.height).toBeGreaterThanOrEqual(843);
  expect(shirt.width).toBeGreaterThan(350);
  expect(shirt.height).toBeGreaterThan(300);
  expect(tray.y).toBeGreaterThan(400);
  expect(tray.y + tray.height).toBeLessThanOrEqual(845);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(845);
  await page.getByRole("button", { name: "Fold my shirt" }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: /Add a rubber band/ }).click();
  await page.getByRole("button", { name: "Bring on the dye" }).click();
  await expect(page.getByRole("button", { name: "Dye B" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();
  await page.getByRole("button", { name: "Surprise me with a mix" }).click();
  await page.getByRole("button", { name: "Ready for the surprise" }).click();
  await page.getByRole("button", { name: "Unfold the surprise" }).click();
  await expect(
    page.getByRole("heading", { name: "It’s a girl!" }),
  ).toBeVisible();
});

test("v2 desktop keeps the fold action visible with every fold choice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Let’s play" }).click();
  await expect(page.locator(".fold-option")).toHaveCount(6);
  const [controls, action] = await Promise.all([
    page.locator(".controls").boundingBox(),
    page.locator("#next-button").boundingBox(),
  ]);
  expect(action.y).toBeGreaterThanOrEqual(controls.y);
  expect(action.y + action.height).toBeLessThanOrEqual(
    controls.y + controls.height,
  );
});

test("v2 intro fits a short phone without scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  const intro = page.getByRole("dialog", {
    name: "The Clark family is expecting another blessing in 2027.",
  });
  const card = await intro.locator(".game-intro-card").boundingBox();
  expect(card.x).toBeGreaterThanOrEqual(0);
  expect(card.x + card.width).toBeLessThanOrEqual(375);
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height).toBeLessThanOrEqual(667);
  expect(Math.abs(card.y + card.height / 2 - 667 / 2)).toBeLessThan(2);
  const headlineType = await intro.locator("h1").evaluate((heading) => {
    const style = getComputedStyle(heading);
    return {
      family: style.fontFamily,
      size: parseFloat(style.fontSize),
      lineHeight: parseFloat(style.lineHeight),
    };
  });
  expect(headlineType.family).toContain("DM Serif Display");
  expect(headlineType.lineHeight / headlineType.size).toBeGreaterThan(1.08);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(667);
  await page.screenshot({
    path: "/tmp/little-secret-v2-intro.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Let’s play" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose your fold." }),
  ).toBeVisible();
});

test("every v2 game tray fits a short phone without internal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await page.getByRole("button", { name: "Let’s play" }).click();
  async function expectTrayToFit() {
    const dimensions = await page.locator("#step-content").evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(
      dimensions.clientHeight + 2,
    );
  }
  await expectTrayToFit();
  await page.getByRole("button", { name: "Fold my shirt" }).click();
  await expect(page.getByRole("heading", { name: "Place three bands." })).toBeVisible();
  await expectTrayToFit();
  for (let index = 0; index < 3; index++)
    await page.getByRole("button", { name: /Add a rubber band/ }).click();
  await page.getByRole("button", { name: "Bring on the dye" }).click();
  await expect(page.getByRole("heading", { name: "Make a little mess." })).toBeVisible();
  await expectTrayToFit();
  await page.screenshot({
    path: "/tmp/little-secret-v2-short-phone-dye.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Surprise me with a mix" }).click();
  await page.getByRole("button", { name: "Ready for the surprise" }).click();
  await expect(page.getByRole("heading", { name: "Ready, little love?" })).toBeVisible();
  await expectTrayToFit();
  await page.getByRole("button", { name: "Unfold the surprise" }).click();
  await expect(page.getByRole("heading", { name: "It’s a girl!" })).toBeVisible();
  await expectTrayToFit();
  await page.getByRole("button", { name: "Save & share", exact: true }).click();
  await expect(page.getByLabel("Made by")).toBeVisible();
  await expectTrayToFit();
});
