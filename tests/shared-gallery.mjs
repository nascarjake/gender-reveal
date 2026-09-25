// Run only against your own configured gallery. Writes one shirt to the demo collection.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const first = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1100 },
  });
  const page = await first.newPage();
  let uploadedId;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/shirts")) {
      uploadedId = request.postDataJSON().id;
    }
  });
  const testUrl = process.env.SHARED_TEST_URL || "http://127.0.0.1:5173/";
  const legacyTestUrl = new URL(testUrl);
  legacyTestUrl.searchParams.set("ui", "v1");
  await page.goto(legacyTestUrl.href);
  assert.match(
    await page.locator("#demo-label").textContent(),
    /DEMO/,
    "Shared-gallery smoke tests require a demo-configured preview to avoid writing test shirts to the family collection.",
  );
  await page.getByRole("button", { name: "Fold my shirt" }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: /Add a rubber band/ }).click();
  await page.getByRole("button", { name: "Bring on the dye" }).click();
  const canvas = page.locator("#shirt-canvas"),
    box = await canvas.boundingBox();
  for (const [x, y] of [
    [0.5, 0.35],
    [0.57, 0.45],
    [0.44, 0.56],
    [0.54, 0.65],
  ])
    await canvas.click({ position: { x: box.width * x, y: box.height * y } });
  await page.getByRole("button", { name: "Ready for the surprise" }).click();
  await page.getByRole("button", { name: "Unfold the surprise" }).click();
  await page
    .getByRole("button", { name: "Heart sticker", exact: true })
    .click();
  await page.getByRole("button", { name: "Save & share", exact: true }).click();
  await page.getByLabel("Made by").fill("Gallery verification");
  await page.getByLabel("Give your tee a name").fill("Shared gallery test");
  const submission = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().endsWith("/shirts"),
  );
  await page
    .getByRole("button", { name: "Hang it on the clothesline" })
    .click();
  const response = await submission;
  assert.equal(response.status(), 201, await response.text());
  await writeFile(
    "/tmp/little-secret-shared-test.json",
    JSON.stringify({ id: uploadedId }),
  );
  await page
    .getByRole("heading", { name: "Shared gallery test", exact: true })
    .waitFor();
  const second = await browser.newContext({
      viewport: { width: 1100, height: 900 },
    }),
    guest = await second.newPage();
  await guest.goto(legacyTestUrl.href);
  await guest.getByRole("button", { name: /The clothesline/ }).click();
  await guest.getByRole("button", { name: "Take a peek" }).click();
  await guest
    .getByRole("heading", { name: "Shared gallery test", exact: true })
    .waitFor();
  const img = guest.getByRole("img", {
    name: "Shared gallery test",
    exact: true,
  });
  await img.evaluate(async (image) => {
    await image.decode();
  });
  assert.equal(await img.evaluate((image) => image.naturalWidth), 420);
  await guest.screenshot({
    path: "/tmp/little-secret-clothesline.png",
    fullPage: true,
  });
  console.log(
    "PASS: a shirt created by one guest is visible, with its image, to a separate browser guest.",
  );
} finally {
  await browser.close();
}
