import { test, expect } from "@playwright/test";
async function makeShirt(page, fold = "Spiral") {
  await page.goto("/");
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
  await expect(page.locator("#canvas-error")).toBeHidden();
  await expect(page.locator("#drop-count")).toHaveText("5 little splashes");
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
  await page.reload();
  await page.getByRole("button", { name: /The clothesline/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Take a peek" }).click();
  await expect(
    page.getByRole("heading", { name: "Sunshine & love" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
for (const fold of ["Accordion", "Scrunch"])
  test(`${fold}: tie, dye, undo, reveal and reset`, async ({ page }) => {
    await makeShirt(page, fold);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator("#drop-count")).toHaveText("4 little splashes");
    await page.getByRole("button", { name: "Ready for the surprise" }).click();
    await page.getByRole("button", { name: "Unfold the surprise" }).click();
    await expect(
      page.getByRole("heading", { name: "It’s a girl!" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Start fresh" }).click();
    await expect(
      page.getByRole("heading", { name: "Choose your fold." }),
    ).toBeVisible();
  });
test("mobile layout has no horizontal overflow and keyboard can finish dye step", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
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
  await page.goto("/");
  await page.screenshot({
    path: "/tmp/little-secret-desktop.png",
    fullPage: true,
  });
});

async function revealWithButtons(page) {
  await page.goto("/");
  await expect(
    page.getByText("Madison’s going to be a big sister!", { exact: false }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Fold my shirt" }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: /Add a rubber band/ }).click();
  await page.getByRole("button", { name: "Bring on the dye" }).click();
  await page.getByRole("button", { name: "Add a few splashes for me" }).click();
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
  await page.goto("/");
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
    await page.goto("/");
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
      .getByRole("button", { name: "Add a few splashes for me" })
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
  await page.goto("http://127.0.0.1:5174/");
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
