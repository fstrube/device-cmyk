import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { collectDeviceCmykProfileSrc } from '../src/color-profile.ts';
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

describe('collectDeviceCmykProfileSrc', () => {
  const base = 'https://example.com/css/style.css';

  test('uses the last device-cmyk profile and ignores dashed-ident profiles', () => {
    const src = collectDeviceCmykProfileSrc(
      `
      @color-profile --foo {
        src: url("/profiles/ignored.icc");
      }

      @color-profile device-cmyk {
        src: url("/profiles/first.icc");
      }

      @color-profile device-cmyk {
        src: url("../profiles/last.icc");
      }
    `,
      base
    );

    assert.equal(src, 'https://example.com/profiles/last.icc');
  });
});
