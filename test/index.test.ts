import test, { after, before, describe } from 'node:test';
import { Browser, BrowserContext, firefox, chromium } from 'playwright';
import { diff } from './utils';
import DeviceCMYK from '../src/device-cmyk';
import ICCProfile from '../src/icc-profile';

declare global {
  interface Window {
    DeviceCMYK: typeof DeviceCMYK;
  }
}

[chromium, firefox].forEach(async (browserType) => {
  let browser: Browser;
  let context: BrowserContext;

  before(async () => {
    browser = await browserType.launch({ headless: true });

    context = await browser.newContext();
  });

  after(async () => {
    await browser.close();
  });

  describe(`${browserType.name()}`, () => {
    test('runs on load', async () => {
      const page = await context.newPage();

      page.on('console', (message) => {
        console.log(message.text());
      });

      await page.goto('http://localhost:3000');

      await page.waitForFunction(() => window.DeviceCMYK !== undefined, null, { timeout: 500 });

      await page.close();
    });

    test('transforms device-cmyk colors', async (t) => {
      const page = await context.newPage();

      page.on('console', (message) => {
        console.log(message.text());
      });

      await page.goto('http://localhost:3000');

      await page.waitForFunction(() => window.DeviceCMYK !==undefined, null, { timeout: 500 });

      const screenshot = await page.screenshot({ fullPage: true });

      diff(`${browserType.name()}/${t.name}`)(screenshot);

      await page.close();
    });

    test('restores original styles', async (t) => {
      const page = await context.newPage();

      page.on('console', (message) => {
        console.log(message.text());
      });

      await page.goto('http://localhost:3000');

      await page.waitForFunction(() => window.DeviceCMYK !== undefined, null, { timeout: 500 });

      await page.evaluate(async () => {
        await DeviceCMYK.restore();
      });

      const screenshot = await page.screenshot({ fullPage: true });

      diff(`${browserType.name()}/${t.name}`)(screenshot);

      await page.close();
    });

    test('supports icc profiles', async (t) => {
      const page = await context.newPage();

      page.on('console', (message) => {
        console.log(message.text());
      });

      await page.goto('http://localhost:3000');

      await page.waitForFunction(() => window.DeviceCMYK !== undefined, null, { timeout: 500 });

      await page.evaluate(async () => {
        const profile = await ICCProfile.open('/profiles/USSheetfedCoated.icc');

        DeviceCMYK.restore();

        await DeviceCMYK.init(profile);
      });

      const screenshot = await page.screenshot({ fullPage: true });

      diff(`${browserType.name()}/${t.name}`)(screenshot);

      await page.close();
    });
  });
});
