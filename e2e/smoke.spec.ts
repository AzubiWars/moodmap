import { expect, test } from '@playwright/test';

test('Mood-Check → Danke → Karte', async ({ page }) => {
  await page.goto('/s/DEMO42');
  await page.getByRole('button', { name: "Los geht's" }).click();
  await page.locator('main [role="radio"]').first().waitFor({ state: 'visible' });

  // Kernfragen und zwei Swipe-Karten beantworten, bis der Freitext erscheint.
  for (let i = 0; i < 14; i++) {
    if (await page.getByRole('heading', { name: 'Was sollte sich an deiner Schule ändern?' }).count()) {
      break;
    }
    const scale = page.locator('main [role="radio"]').first();
    if (await scale.count()) {
      await scale.click();
      await page.waitForTimeout(350);
      continue;
    }
    const swipe = page.getByRole('button', { name: 'Trifft zu' });
    if (await swipe.count()) {
      await swipe.click();
      await page.waitForTimeout(350);
      continue;
    }
    const help = page.getByRole('button', { name: 'Weiter' });
    if ((await help.count()) && (await help.isEnabled())) {
      await help.click();
      await page.waitForTimeout(350);
      continue;
    }
    await page.getByRole('button', { name: 'Überspringen' }).click();
    await page.waitForTimeout(350);
  }

  await expect(page.getByRole('heading', { name: 'Was sollte sich an deiner Schule ändern?' })).toBeVisible();
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.getByRole('button', { name: 'Jetzt anonym absenden' }).click();
  await expect(page).toHaveURL(/\/check\/done/);

  await page.goto('/map');
  await expect(page.getByRole('heading', { name: 'Moodmap NRW' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gesamt-Mood' })).toHaveAttribute('aria-pressed', 'true');
});
