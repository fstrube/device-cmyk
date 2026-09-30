# Claude

Read [README.md](README.md) before changing this project. It is the source of truth for what the script does, how to use it, and how to run tests.

A few notes while you work:

- Source is `src/`. The browser file is `dist/device-cmyk.polyfill.js` from `npm run build`. Do not commit `dist/`.
- Visual tests need `npm start` on port 3000, then `npm test`.
- Update screenshots with `npm run test:snapshot` only when the page is supposed to look different. Expected images are in `test/expected/`.
- Match the existing TypeScript style. Do not add docs or comments the change does not need.
