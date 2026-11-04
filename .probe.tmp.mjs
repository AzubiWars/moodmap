import { chromium } from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ acceptDownloads: true });
const p = await ctx.newPage();
p.on('response', (r) => {
  const ct = r.headers()['content-type'] || '';
  if (!/css|javascript|image|font/.test(ct)) console.log('RESP', r.status(), ct, r.url().slice(0, 140));
});
await p.goto(
  'https://apps.schulministerium.nrw.de/BiPo/SchuleSuchen/pages/schulsuche/schule_information_seite.xhtml?schulnummer=100015',
);
const btns = p.locator('input[value^="Untstat"]');
console.log('buttons', await btns.count());
const last = btns.last();
console.log(await last.getAttribute('value'));
const [dl, np] = await Promise.all([
  p.waitForEvent('download', { timeout: 15000 }).catch(() => null),
  ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null),
  last.click(),
]);
if (dl) {
  await dl.saveAs(`${out}/untstat.pdf`);
  console.log('DL', dl.suggestedFilename());
}
if (np) {
  await np.waitForTimeout(3000);
  console.log('NEWPAGE', np.url());
}
await p.waitForTimeout(2000);
await b.close();
