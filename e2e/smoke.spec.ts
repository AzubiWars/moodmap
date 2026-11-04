import { expect, test } from '@playwright/test';

test('Mood-Check startet und Karte lädt', async ({ page }) => {
  await page.goto('/s/DEMO42');
  await page.getByRole('button', { name: "Los geht's" }).click();

  await expect(page.locator('main [role="radio"]').first()).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Fortschritt' })).toBeVisible();

  await page.goto('/map');
  await expect(page.getByRole('heading', { name: 'Moodmap NRW' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thema: Gesamt-Mood' })).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  // Release-Ansicht (#295): ohne ?erweitert=1 keine Modi, kein Filter, keine Kartenextras.
  await expect(page.getByRole('radio', { name: 'Trend' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'NRW-Ansicht' })).toHaveCount(0);

  await page.goto('/map?erweitert=1');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Herauszoomen' }).click();
  await page.getByRole('button', { name: 'Herauszoomen' }).click();
  await page.getByRole('button', { name: 'NRW-Ansicht' }).click();
  await expect(page.getByRole('button', { name: 'Vollbild öffnen' })).toBeVisible();

  // Schul-Suche (#245): echter NRW-Standort zoomt bis in die 3D-Gebäudeansicht.
  await page.getByRole('searchbox', { name: 'Schule oder Stadt suchen' }).fill('Stettiner');
  await page
    .getByRole('button', { name: /Stettiner Straße/ })
    .first()
    .click();
  const toggle = page.getByRole('button', { name: '3D-Ansicht umschalten' });
  await expect(toggle).toHaveText('2D');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  // Theme-/Moduswechsel laden einen neuen MapLibre-Style: keine Layer-Reihenfolgefehler.
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const mode = page.getByRole('radio', { name: 'Trend' });
  await mode.click();
  await page.getByRole('radio', { name: 'Stimmung' }).click();
  const theme = page.getByRole('button', { name: /Dunklen Modus aktivieren|Hellen Modus aktivieren/ });
  await theme.click();
  await page.waitForTimeout(600);
  await theme.click();
  expect(pageErrors).toEqual([]);
});
