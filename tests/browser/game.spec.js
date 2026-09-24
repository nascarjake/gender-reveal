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
    page.getByRole("heading", { name: "It’s a boy!" }),
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
  await page.getByLabel("Made by").fill("Auntie Test");
  await page.getByLabel("Give your tee a name").fill("Sunshine & love");
  await page
    .getByRole("button", { name: "Flower sticker", exact: true })
    .click();
  await page.screenshot({
    path: "/tmp/little-secret-revealed.png",
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save my shirt", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
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
      page.getByRole("heading", { name: "It’s a boy!" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Start fresh" }).click();
    await expect(
      page.getByRole("heading", { name: "Let’s roll with it." }),
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
