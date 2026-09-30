import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { TestContext } from 'node:test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export function diff(name: string) {
  return function(screenshot: Buffer) {
    const actual = PNG.sync.read(screenshot);
    const actualPath = path.join(__dirname, 'actual', `${name}.png`);
    const expectedPath = path.join(__dirname, 'expected', `${name}.png`);

    fs.writeFileSync(actualPath, PNG.sync.write(actual));

    if (process.env.SNAPSHOT) {
      fs.writeFileSync(expectedPath, PNG.sync.write(actual));

      return;
    }

    const expected = fs.existsSync(expectedPath) ? PNG.sync.read(fs.readFileSync(expectedPath)) : new PNG({ width: actual.width, height: actual.height });

    if (actual.width !== expected.width || actual.height !== expected.height) {
      throw new Error(`Expected "test/actual/${name}.png" to match "test/expected/${name}.png": dimensions mismatch`);
    }

    const diff = new PNG({ width: actual.width, height: actual.height });
    const numDiffPixels = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, { threshold: 0.1 });

    fs.writeFileSync(path.join(__dirname, 'diffs', `${name}.png`), PNG.sync.write(diff));

    assert.strictEqual(numDiffPixels, 0, `Expected "test/actual/${name}.png" to match "test/expected/${name}.png": ${numDiffPixels} pixels differ`);
  }
}
