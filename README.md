# device-cmyk

<div align="center">

![CMYK](./public/cmyk.svg)
</div>

<div align="center">

[![.github/workflows/run-tests.yml](https://github.com/fstrube/device-cmyk/actions/workflows/run-tests.yml/badge.svg?event=push)](https://github.com/fstrube/device-cmyk/actions/workflows/run-tests.yml) [![NPM Version](https://img.shields.io/npm/v/device-cmyk?label=version)
](https://npmjs.com/package/device-cmyk)
</div>

A browser polyfill that makes the CSS `device-cmyk()` color work. Browsers do not support that function yet. This script finds it in your styles and replaces it with `rgba()`.

Without an ICC profile, cyan, magenta, yellow, and black are converted with a simple formula. With a profile, the same colors are converted through that profile so they look closer to print.

## Use it

See the [examples](./examples/) folder.

The easiest way to use the polyfill is through a CDN:

```html
<script src="https://unpkg.com/device-cmyk@latest/dist/device-cmyk.polyfill.js"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/device-cmyk@latest/dist/device-cmyk.polyfill.js"></script>
```

The script runs when the page loads. It rewrites:

- `<style>` blocks
- `<link rel="stylesheet">` files
- `@import` rules, including nested imports
- `style` attributes
- later changes made with `element.style` or `setProperty`

```html
<style>
  .cyan {
    background-color: device-cmyk(1 0 0 0);
    color: white;
  }

  .red {
    background-color: device-cmyk(0, 1, 1, 0);
  }
</style>

<p style="color: device-cmyk(0 0 0 1)">Black text</p>
```

After the polyfill runs, those values look like `rgba(...)` to the browser.

### Importing

If you want to use the inner workings of the `DeviceCMYK` library, you can add the package in your `package.json`:

```
npm install --save-dev device-cmyk
```

Then, you can import the library in your scrips like below:

**EcmaScript Modules**

```js
import 'device-cmyk'

document.addEventListener('DOMContentLoaded', async () => {
  await DeviceCMYK.init();
})
```

## Color syntax

Each channel is a number from `0` to `1`, or a percentage. `none` means `0`. An optional alpha comes after `/`. See [device-cmyk() CSS function](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/device-cmyk) for more details.

```css
background: device-cmyk(0 81% 81% 30%);
background: device-cmyk(none 0.81 0.81 0.3);
background: device-cmyk(0, 0.81, 0.81, 0.3);
background: device-cmyk(0 81% 81% 30% / 0.5);
background: device-cmyk(0 81% 81% 30% / 50%);
```

You can also convert one value yourself:

```js
DeviceCMYK.parseCMYK('device-cmyk(0 81% 81% 30% / 50%)');
// "rgba(179,34,34,0.5)"

DeviceCMYK.transform(0, 0.81, 0.81, 0.3);
// [179, 34, 34]
```

## ICC profiles

Add a meta tag to pick a profile before the script runs:

```html
<meta name="x-icc-profile" content="/profiles/USSheetfedCoated.icc">
<script src="/dist/device-cmyk.polyfill.js"></script>
```

Or load one from JavaScript. `init` replaces the current conversion and scans the page again.

```js
const profile = await ICCProfile.open('/profiles/USSheetfedCoated.icc');

await DeviceCMYK.restore();
await DeviceCMYK.init(profile);
```

Clear the profile and go back to the simple formula:

```js
await DeviceCMYK.restore();
await DeviceCMYK.init();
```

A profile must be a CMYK ICC file with an `mft2` color table (`A2B0` or `A2B1`). Other table types are rejected.

Profiles included in this repo:

- `CoatedFOGRA27.icc`, `CoatedFOGRA39.icc`, `UncoatedFOGRA29.icc`, `WebCoatedFOGRA28.icc`
- `USSheetfedCoated.icc`, `USSheetfedUncoated.icc`, `USWebCoatedSWOP.icc`, `USWebUncoated.icc`
- `JapanColor2001Coated.icc`, `JapanColor2001Uncoated.icc`, `JapanColor2002Newspaper.icc`, `JapanWebCoated.icc`

## Script API

`DeviceCMYK` and `ICCProfile` are available on `window` after the script loads.

### DeviceCMYK

| Method | Signature | Description |
|--------|-----------|-------------|
| `init` | `static init(profile?: ICCProfile): Promise<void>` | Initialize the polyfill. Scans and converts `device-cmyk()` in styles. Optionally apply an ICC profile for print-accurate colors. |
| `setProfile` | `static setProfile(profile?: ICCProfile): void` | Set or remove the active ICC profile. Pass `undefined` to use simple CMYK conversion. |
| `restore` | `static restore(): Promise<void>` | Restore original styles and stop watching for changes. Reverts all `device-cmyk()` to their source form. |
| `disconnect` | `static disconnect(): void` | Stop observing DOM mutations. Does not restore styles. |
| `transform` | `static transform(c: number, m: number, y: number, k: number): number[]` | Convert CMYK values (0–1) to `[R, G, B]` (0–255). Uses current profile or simple formula. |
| `parseCMYK` | `static parseCMYK(value: string): string` | Parse a CSS `device-cmyk()` string and return `rgba(...)`. |

### ICCProfile

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `new ICCProfile(buffer: ArrayBuffer)` | Create a profile from raw ICC file bytes. |
| `open` | `static open(url: string): Promise<ICCProfile>` | Fetch and parse an ICC profile from a URL. |
| `transform` | `transform(c: number, m: number, y: number, k: number): number[]` | Convert CMYK to sRGB using this profile's lookup tables. |

### Usage Examples

Initialize the polyfill:

```js
await DeviceCMYK.init();
```

Load an ICC profile from a URL:

```js
const profile = await ICCProfile.open('/profiles/USSheetfedCoated.icc');
await DeviceCMYK.init(profile);
```

Load an ICC profile from bytes:

```js
const buffer = await fetch('/profiles/CoatedFOGRA39.icc').then((res) => res.arrayBuffer());
const profile = new ICCProfile(buffer);
await DeviceCMYK.init(profile);
```

Convert a CMYK value to RGB:

```js
const rgb = DeviceCMYK.transform(0, 0.81, 0.81, 0.3);
// [179, 34, 34]
```

Parse a CSS `device-cmyk()` string:

```js
const rgba = DeviceCMYK.parseCMYK('device-cmyk(0 81% 81% 30% / 50%)');
// "rgba(179,34,34,0.5)"
```

Change a color after the page has loaded:

```js
element.style.backgroundColor = 'device-cmyk(0.25 0.25 0.25 0.25)';

element.style.setProperty('background-color', 'device-cmyk(1 0 0 0)');

element.setAttribute('style', 'background-color: device-cmyk(0 1 0 0)');
```

Restore original styles:

```js
await DeviceCMYK.restore();
```

## Develop

```sh
npm install
npm run build
npm start
```

`npm start` serves the `public/` folder at <http://localhost:3000>. The demo page is `public/index.html`.

All source code is TypeScript. After any change you need to build the scripts. You can make this easier by "watching" the build process:

```
npm run build -- -- --watch
```

### npm Scripts

| Script | Purpose |
|--------|---------|
| `build` | Compile TypeScript and bundle the polyfill. Runs type check, tsup, and esbuild. |
| `build:polyfill` | Bundle only the browser polyfill (`dist/device-cmyk.polyfill.js`) with sourcemap. |
| `start` | Start the dev server on port 3000. Serves `public/` with hot-reload via tsx. |
| `test` | Run all tests locally (parsing, screenshots, no CI reporters). |
| `test:ci` | Run full CI suite: main tests + npm link test + tarball test. Outputs JUnit XML. |
| `test:main` | Run visual tests and unit tests with JUnit reporter. |
| `test:link` | Test via `npm link` (development symlink). Pre/post hooks handle setup. |
| `test:package` | Test via `npm pack` (tarball install). Pre/post hooks handle setup. |
| `test:snapshot` | Update screenshot baselines. Use only when visuals intentionally change. |

## Tests

Requires Node 26, Playwright browsers, and a running dev server. This all runs inside a Docker environment for isolated, reporducible testing:

```sh
docker compose up --build -d --wait
```

This starts the app on port 3000 inside the container network. It also waits for the server to start and become "healthy", meaning all dependencies have been installed. This can take up to 1 minute to complete.

The test suite can be invoked with the following command:

```sh
docker compose exec app npm run test:ci
```

The test suite:

- Runs unit tests for color parsing
- Opens a browser (Chromium, Firefox) and compares screenshots
- Tests the package via `npm link` and `npm pack`

Failed screenshots are saved to `test/actual/` and diffs to `test/diffs/`. Expected images are in `test/expected/`.

### Update screenshots

When expected visuals change:

```sh
npm run build
docker compose exec app npm run test:snapshot
```

Only run `test:snapshot` after confirming the changes are intentional.

## Contributing

Source is TypeScript in `src/`. The file you ship is `dist/device-cmyk.polyfill.js`, built with:

```sh
npm run build
```

`dist/` is not committed. Build it before you try the demo page.

Keep changes small and covered by a test. Parsing changes belong in `test/parse-cmyk.test.ts`. Changes you can see on the page belong in `test/index.test.ts`. Update the expected screenshot in the same change if the picture should look different.
