import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function startBook(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open the demo book' }).click();
}

test('demo flow, refresh restoration, reset and accessibility', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await startBook(page);
  const source = (await page.locator('.page-left .typed-text').innerText()).replace(/\s+/g, ' ').trim();
  const textarea = page.getByRole('textbox', { name: 'Type the passage on the left page' });
  const otherPage = page.getByRole('textbox', { name: 'Type the passage on the right page' });
  const typoAt = source.indexOf('photosynthesis') + 8;
  expect(typoAt).toBeGreaterThan(7);
  await expect(page.getByRole('region', { name: 'Live typing stats' })).toBeVisible();
  await textarea.pressSequentially(source.slice(0, typoAt), { delay: 8 });
  await expect(otherPage).toHaveValue(source.slice(0, typoAt));
  await textarea.pressSequentially('x', { delay: 8 });
  await textarea.press('Backspace');
  const completionVisible = page.locator('.toast').waitFor({ state: 'visible', timeout: 10_000 });
  await textarea.pressSequentially(source.slice(typoAt), { delay: 8 });
  await completionVisible;
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.page-right.is-turning')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('Quick recall');
  await page.getByLabel('Your answer').fill('oxygen');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Start Echo Review' }).click();
  await expect(page.getByRole('dialog')).toContainText('photosynthesis');
  await page.getByLabel('Missing word').fill('photosynthesis');
  await page.getByRole('button', { name: 'Check word' }).click();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('.page-title').first()).toHaveText('The Water Cycle', { timeout: 5_000 });

  const secondPage = (await page.locator('.page-left .typed-text').innerText()).replace(/\s+/g, ' ').trim();
  await textarea.pressSequentially(secondPage.slice(0, 24), { delay: 8 });
  await page.reload();
  await expect(textarea).toHaveValue(secondPage.slice(0, 24));
  await expect(otherPage).toHaveValue(secondPage.slice(0, 24));
  await page.getByRole('button', { name: 'Page 1' }).click();
  await expect(textarea).toHaveValue(/photosynthesis/);
  await expect(otherPage).toHaveValue(/photosynthesis/);
  expect(await textarea.evaluate((element: HTMLTextAreaElement) => element.readOnly)).toBe(true);
  expect(await otherPage.evaluate((element: HTMLTextAreaElement) => element.readOnly)).toBe(true);
  await page.getByRole('button', { name: 'Return to current page' }).click();
  await expect(textarea).toHaveValue(secondPage.slice(0, 24));

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).last().click();
  await expect(page.getByRole('button', { name: 'Open the demo book' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('Demo assist jumps pages and auto-types with a real typo correction', async ({ page }) => {
  await startBook(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Demo assist' }).click();
  const settingsAxe = await new AxeBuilder({ page }).analyze();
  expect(settingsAxe.violations).toEqual([]);
  await page.getByLabel('Jump to page').selectOption('1');
  await page.getByRole('button', { name: 'Go to page' }).click();
  await expect(page.locator('.page-title').first()).toHaveText('The Water Cycle');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Jump to page').selectOption('0');
  await page.getByRole('button', { name: 'Go to page' }).click();
  await expect(page.locator('.page-title').first()).toHaveText('How Plants Make Food');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Typing speed').selectOption('70');
  await page.getByLabel('Scripted stumble').selectOption('photosynthesis');
  await page.getByRole('button', { name: 'Auto-type with correction' }).click();
  await expect(page.getByRole('dialog')).toContainText('Quick recall', { timeout: 20_000 });
  await page.getByLabel('Your answer').fill('oxygen');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Start Echo Review' }).click();
  await expect(page.getByRole('dialog')).toContainText('photosynthesis');
});

test('corrupt storage recovers and 375px layout has no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('keyturn.memory-edition', '{broken-json'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open the demo book' })).toBeVisible();
  await page.getByRole('button', { name: 'Open the demo book' }).click();

  const screenshots = join(process.cwd(), 'docs', 'screenshots');
  await mkdir(screenshots, { recursive: true });
  for (const width of [1440, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.spread')).toBeVisible();
    if (width === 375) {
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    }
    await page.screenshot({ path: join(screenshots, `keyturn-${width}.png`), fullPage: true });
  }
});

test('production shell reloads with the network offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers are unavailable');
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cachedAssets = await page.evaluate(async () => {
    const cache = await caches.open('keyturn-shell-v2');
    return (await cache.keys()).map((request) => request.url);
  });
  expect(cachedAssets.some((asset) => asset.endsWith('.js'))).toBe(true);
  expect(cachedAssets.some((asset) => asset.endsWith('.css'))).toBe(true);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('button', { name: 'Open the demo book' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
