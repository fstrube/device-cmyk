import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import DeviceCMYK from '../src/device-cmyk.ts';

const cases = [
  ['device-cmyk(0 81% 81% 30%)', 'rgba(179,34,34,1)'],
  ['device-cmyk(none 0.81 0.81 0.3)', 'rgba(179,34,34,1)'],
  ['device-cmyk(0 81% 81% 30% / .5)', 'rgba(179,34,34,0.5)'],
  ['device-cmyk(0 81% 81% 30% / 50%)', 'rgba(179,34,34,0.5)'],
  ['device-cmyk(0, 0.81, 0.81, 0.3)', 'rgba(179,34,34,1)'],
] as const;

describe('DeviceCMYK.parseCMYK', () => {
  for (const [input, expected] of cases) {
    test(input, () => {
      assert.equal(DeviceCMYK.parseCMYK(input), expected);
    });
  }
});
