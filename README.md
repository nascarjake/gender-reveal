# A little secret

A WebGL tie-dye game for a baby reveal. Guests choose a spiral, accordion, or scrunch fold, drag three rubber bands onto the fabric (or add them with a button), and paint with two secret dye colors, three shade strengths, and three splash sizes. Everything stays grayscale until opening the shirt reveals a pink or blue pattern shaped by their exact dye placement. They can add a name, title, and up to eight draggable, resizable stickers, download a PNG, hang it on a shared clothesline, and start another numbered shirt.

The game is a static **GitHub Pages** site. A small **Cloudflare Worker + D1** service stores shared shirts; guests do not need to sign in. Demo, pink, and blue collections are separate.

## Run

Use Node 22 (`nvm use` if you have nvm):

```sh
npm ci
npm run dev
```

The studio uses a custom WebGL fragment shader with no runtime dependencies. Vite builds relative asset paths so it works under a GitHub Pages repository path. Google Fonts are optional; system fonts take over when unavailable.

The original editorial interface remains the default. Add `?ui=v2` to the URL
to open the full-screen fashion-game interface while using the same game state,
WebGL renderer, reveal, and shared clothesline.

## Choose the reveal

Copy `.env.example` to `.env.local`. The Clark family reveal is set to `VITE_REVEAL=pink`. Restart the development server after changes.

The default is the Clark family’s **pink reveal**, celebrating their second daughter and Madison becoming a big sister. `VITE_REVEAL=demo` enables a clearly labeled blue practice reveal. For deployment, set the repository variable `VITE_REVEAL` under **Settings → Secrets and variables → Actions → Variables**, then run the deployment workflow again. Demo shirts will not appear in the real reveal's gallery.

The reveal value is included in the browser's built JavaScript. It stays hidden during normal gameplay but is discoverable by someone inspecting the code. The clothesline asks before showing finished shirts to a guest who has not revealed their own.

## GitHub Pages deployment

`.github/workflows/deploy.yml` tests, builds, and deploys pushes to `main`.

1. Push this project to a GitHub repository.
2. Under **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. Set `VITE_GALLERY_URL` to the deployed Worker URL, without a trailing slash.
4. Set `VITE_REVEAL` when ready for the actual reveal; use `demo` for practice.
5. Run **Deploy game to GitHub Pages** from Actions, or push a commit to `main`.

Reference: [Custom workflows for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Shared clothesline

The deployed Cloudflare Worker uses the D1 database configured in `worker/wrangler.jsonc`. It stores bounded PNG snapshots with the optional name and title. Images load lazily as guests browse the clothesline.

To run locally:

```sh
npx wrangler d1 migrations apply little-secret-clothesline --local --config worker/wrangler.jsonc
npm run gallery:dev
```

Set `VITE_GALLERY_URL=http://127.0.0.1:8787` in `.env.local` and restart Vite. Without this variable, the gallery stores up to 24 shirts on the current device and labels itself accordingly. Downloads work in either mode.

For a new Cloudflare account, remove the existing `database_id`, then create your own database:

```sh
npx wrangler d1 create little-secret-clothesline --config worker/wrangler.jsonc --binding DB --update-config
npx wrangler d1 migrations apply little-secret-clothesline --remote --config worker/wrangler.jsonc
npm run gallery:deploy
```

Update `ALLOWED_ORIGINS` to include your site's origin and rerun `npm run gallery:types` if the configuration changes. Deploying the frontend does not deploy Worker changes; use `npm run gallery:deploy` for those.

The service checks image dimensions and file signatures, limits request size, uses parameterized queries, accepts browser submissions from configured origins, and rate-limits writes to 30 per minute per IP at each Cloudflare location. A database trigger caps storage at 1,000 shirts. These are abuse limits, not invitation-based access: the gallery is public to people with the URL. Names and titles are optional. Submissions cannot be edited or deleted through the public API; the owner can moderate them in the Cloudflare D1 console. No IP addresses or guest login credentials are stored by the app.

References: [D1 bindings](https://developers.cloudflare.com/d1/worker-api/), [Worker rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Checks

```sh
npm test
npm run build
npm run test:browser
```

The browser suite uses local Google Chrome on macOS. Set `CHROME_PATH` to use another Chrome/Chromium installation. It exercises all folds, dye and undo, grayscale before reveal, color after reveal, customization, PNG download, local gallery persistence, reset, keyboard input, and mobile overflow. The browser suite starts an isolated server on port 5174 with a pink reveal and a device-local gallery, so it never writes test shirts to the live family collection. Screenshots go to the system temporary directory. Worker tests check validation, collection isolation, origin restrictions, and rate limiting.

## Source map

- `src/renderer.js`: WebGL cloth silhouette, folds, grayscale dye, fabric texture, and animated color reveal.
- `src/main.js`: game flow, controls, customization, PNG snapshots, and gallery.
- `src/gallery.js`: shared service connection and device-local fallback.
- `src/model.js`: bounded dye data and state validation.
- `src/style.css`: responsive studio and clothesline.
- `worker/index.js`: shared-gallery API; schema in `worker/migrations`.

Reduced-motion preferences skip the unfolding animation and confetti. A WebGL error message appears when rendering is unavailable. Pointer, touch, and keyboard controls are supported.

## Simple controls for everyone

- Bands: drag a band from the tray onto the folded shirt, tap the tray, or use **Add a rubber band**. **Undo** removes the last band. Placement affects the white resist lines in the finished dye pattern.
- Dye: tap or drag on the cloth, or use **Add a few splashes for me**. The shader keeps all shades gray until the reveal.
- Stickers: tap a shape to add it, drag it into place, and adjust **Size**. The arrow buttons and **Center** are alternatives to dragging. A focused sticker also responds to arrow keys and +/−. **Surprise me** adds up to three stickers; **Remove** deletes only the selected one. Eight is the maximum.
- Finishing: **Decorate** and **Save & share** separate the small editor from the optional name and title fields. Downloads and gallery thumbnails include every sticker at its chosen position and size.
- On phones and tablets, the canvas stays visible and only the control panel scrolls. Landscape uses the shirt and controls side by side.

The optional live smoke test (`node tests/shared-gallery.mjs`) now refuses to submit unless the preview is explicitly in demo mode. Set `SHARED_TEST_URL` to that demo preview; its temporary shirt ID is written to `/tmp/little-secret-shared-test.json` for cleanup.
