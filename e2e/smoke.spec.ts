import { expect, test } from '@playwright/test';

test('Mood-Check startet und Karte lädt', async ({ page }) => {
  await page.goto('/s/DEMO42');
  await page.getByRole('button', { name: "Los geht's" }).click();

  await expect(page.locator('main [role="radio"]').first()).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Fortschritt' })).toBeVisible();

  await page.goto('/map');
  await expect(page.getByRole('heading', { name: 'Moodmap NRW' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gesamt-Mood' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
});
