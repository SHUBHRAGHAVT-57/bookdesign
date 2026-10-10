import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function startBook(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start practice' }).click();
}

test('demo flow, refresh restoration, reset and accessibility', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await startBook(page);
  const source = (await page.locator('.page-left .typed-text').innerText()).replace(/\s+/g, ' ').trim();
  const secondSource = (await page.locator('.page-right .typed-text').innerText()).replace(/\s+/g, ' ').trim();
  const leftInput = page.getByRole('textbox', { name: 'Type the passage on the left page' });
  const rightInput = page.getByRole('textbox', { name: 'Type the passage on the right page' });
  await expect(page.getByRole('region', { name: 'Live typing stats' })).toBeVisible();
  expect(source).not.toBe(secondSource);
  await expect(rightInput).toHaveValue('');
  await leftInput.pressSequentially(source, { delay: 1 });
  await expect(page.locator('.toast')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.page-title').first()).toHaveText('How Plants Make Food');
  await expect(page.locator('.page-title').nth(1)).toHaveText('The Water Cycle');
  await expect(leftInput).toHaveValue(source);
  await expect(rightInput).toHaveValue('');
  expect(await leftInput.evaluate((element: HTMLTextAreaElement) => element.readOnly)).toBe(true);
  expect(await rightInput.evaluate((element: HTMLTextAreaElement) => element.readOnly)).toBe(false);
  await rightInput.pressSequentially(secondSource, { delay: 1 });
  await expect(page.getByRole('dialog')).toContainText('Quick recall', { timeout: 10_000 });
  await expect(page.locator('.page-right.is-turning')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('Quick recall');
  await page.getByLabel('Your answer').fill('condenses into droplets');
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByLabel('Your answer').fill('sunlight');
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByLabel('Your answer').fill('vapour');
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByLabel('Your answer').fill('clouds');
  await page.getByRole('button', { name: 'Finish recall' }).click();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('.page-title').first()).toHaveText('Why Habits Stick', { timeout: 5_000 });

  const thirdSource = (await page.locator('.page-left .typed-text').innerText()).replace(/\s+/g, ' ').trim();
  await leftInput.pressSequentially(thirdSource.slice(0, 24), { delay: 1 });
  await page.reload();
  await expect(leftInput).toHaveValue(thirdSource.slice(0, 24));
  await expect(rightInput).toHaveValue('');
  await page.getByRole('button', { name: 'Page 1' }).click();
  await expect(leftInput).toHaveValue(source);
  expect(await leftInput.evaluate((element: HTMLTextAreaElement) => element.readOnly)).toBe(true);
  expect(await rightInput.evaluate((element: HTMLTextAreaElement) => element.readOnly)).toBe(true);
  await page.getByRole('button', { name: 'Return to current page' }).click();
  await expect(leftInput).toHaveValue(thirdSource.slice(0, 24));

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).last().click();
  await expect(page.getByRole('button', { name: 'Start practice' })).toBeVisible();
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
  await expect(page.locator('.page-title').nth(1)).toHaveText('The Water Cycle', { timeout: 20_000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Scripted stumble').selectOption('evaporation');
  await page.getByRole('button', { name: 'Auto-type with correction' }).click();
  await expect(page.getByRole('dialog')).toContainText('Quick recall', { timeout: 20_000 });
  await page.getByLabel('Your answer').fill('condenses into droplets');
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByLabel('Your answer').fill('sunlight');
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByLabel('Your answer').fill('vapour');
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByLabel('Your answer').fill('clouds');
  await page.getByRole('button', { name: 'Finish recall' }).click();
  await page.getByRole('button', { name: 'Start Echo Review' }).click();
  await expect(page.getByRole('dialog')).toContainText('evaporation');
});

test('corrupt storage recovers and 375px layout has no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('keyturn.memory-edition', '{broken-json'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start practice' })).toBeVisible();
  await page.getByRole('button', { name: 'Start practice' }).click();

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
    await expect(page.getByRole('button', { name: 'Start practice' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
