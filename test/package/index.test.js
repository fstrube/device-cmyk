import { test } from 'node:test';
import assert from 'node:assert';
import { DeviceCMYK } from 'device-cmyk';
import packageJson from 'device-cmyk/package.json' with { type: 'json' };

test('DeviceCMYK should be defined', () => {
  assert(DeviceCMYK, 'DeviceCMYK should be defined');
});

test('DeviceCMYK should have a method to convert RGB to CMYK', () => {
  const rgb = DeviceCMYK.transform(0, 100, 100, 0);

  assert.deepEqual(rgb, [255, 0, 0]);
});

test('should expose package.json', () => {
    assert('version' in packageJson, 'package.json should expose the version');
});
