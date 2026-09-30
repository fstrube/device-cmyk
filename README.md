# device-cmyk

<center>

![CMYK](./public/cmyk.svg)

</center>

<center>

[![.github/workflows/run-tests.yml](https://github.com/fstrube/device-cmyk/actions/workflows/run-tests.yml/badge.svg?event=push)](https://github.com/fstrube/device-cmyk/actions/workflows/run-tests.yml)

</center>

A browser polyfill that makes the CSS `device-cmyk()` color work. Browsers do not support that function yet. This script finds it in your styles and replaces it with `rgba()`.

Without an ICC profile, cyan, magenta, yellow, and black are converted with a simple formula. With a profile, the same colors are converted through that profile so they look closer to print.

## Use it

The easiest way to use polyfill is through a CDN:

```html
<script src="https://unpkg.com/device-cmyk@0.0.1-alpha"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/device-cmyk@0.0.1-alpha"></script>

```

If you want to use the inner workings of the `DeviceCMYK` library, you can include the package in your `package.json`:

```
npm install --save-dev device-cmyk
```

Build the script, then add it to the page:

```sh
npm install
npm run build
```

```html
<script src="/dist/device-cmyk.polyfill.js"></script>
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

After the polyfill runs, those values look like `rgba(...)` to the browser. Call `restore()` to put the original CSS back.

## Color syntax

Each channel is a number from `0` to `1`, or a percentage. `none` means `0`. An optional alpha comes after `/`.

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

```js
await DeviceCMYK.init();
await DeviceCMYK.init(profile);

DeviceCMYK.setProfile(profile);
DeviceCMYK.setProfile(undefined);

await DeviceCMYK.restore();
DeviceCMYK.disconnect();
```

`restore()` puts original `<style>`, `<link>`, and inline styles back, and stops watching the page.

Build an ICC transform from bytes if you already have the file:

```js
const buffer = await fetch('/profiles/CoatedFOGRA39.icc').then((res) => res.arrayBuffer());
const profile = new ICCProfile(buffer);

await DeviceCMYK.init(profile);
```

Change a color after the page has loaded:

```js
element.style.backgroundColor = 'device-cmyk(0.25 0.25 0.25 0.25)';

element.style.setProperty('background-color', 'device-cmyk(1 0 0 0)');

element.setAttribute('style', 'background-color: device-cmyk(0 1 0 0)');
```

## Develop

```sh
npm install
npm run build
npm start
```

`npm start` serves the `public/` folder at <http://localhost:3000>. The demo page is `public/index.html`.

Install the browser used by the visual tests once:

```sh
npx playwright install chromium
```

## Tests

The full suite also opens the demo page and compares screenshots. Start the server first, in another terminal:

```sh
npm start
npm test
```

When a screenshot fails, look at `test/actual/` and `test/diffs/`. Those folders are not committed. The saved images live in `test/expected/`.

To replace the saved screenshots:

```sh
npm run test:snapshot
```

Run that only while `npm start` is still running, and only after you mean to change the expected pictures.

## Contributing

Source is TypeScript in `src/`. The file you ship is `dist/device-cmyk.polyfill.js`, built with:

```sh
npm run build
```

`dist/` is not committed. Build it before you try the demo page.

Keep changes small and covered by a test. Parsing changes belong in `test/parse-cmyk.test.ts`. Changes you can see on the page belong in `test/index.test.ts`. Update the expected screenshot in the same change if the picture should look different.
