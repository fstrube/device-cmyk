import test, { after, before } from 'node:test';
import { Browser, BrowserContext, chromium } from 'playwright';
import { diff } from './utils';
import DeviceCMYK from '../src/device-cmyk';
import ICCProfile from '../src/icc-profile';

let browser: Browser;
let context: BrowserContext;

before(async () => {
  browser = await chromium.launch({ headless: !process.argv.includes('--debug') });

  context = await browser.newContext();
});

after(async () => {
  await browser.close();
});

test('runs on load', async () => {
  const page = await context.newPage();

  await page.goto('http://localhost:3000');

  await page.waitForFunction(() => DeviceCMYK !== undefined, null, { timeout: 100 });

  await page.close();
});

test('transforms device-cmyk colors', async (t) => {
  const page = await context.newPage();

  await page.goto('http://localhost:3000');

  await page.waitForFunction(() => DeviceCMYK !== undefined, null, { timeout: 100 });

  const screenshot = await page.screenshot({ fullPage: true });

  diff(t)(screenshot);

  await page.close();
});

test('restores original styles', async (t) => {
  const page = await context.newPage();

  await page.goto('http://localhost:3000');

  await page.waitForFunction(() => DeviceCMYK !== undefined, null, { timeout: 100 });

  await page.evaluate(() => {
    DeviceCMYK.restore();
  });

  const screenshot = await page.screenshot({ fullPage: true });

  diff(t)(screenshot);

  await page.close();
});

test('supports icc profiles', async (t) => {
  const page = await context.newPage();

  await page.goto('http://localhost:3000');

  await page.waitForFunction(() => DeviceCMYK !== undefined, null, { timeout: 100 });

  await page.evaluate(async () => {
    const profile = await ICCProfile.open('/profiles/USSheetfedCoated.icc');

    DeviceCMYK.restore();

    await DeviceCMYK.init(profile);
  })

  const screenshot = await page.screenshot({ fullPage: true });

  diff(t)(screenshot);

  await page.close();
});
