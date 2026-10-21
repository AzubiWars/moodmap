/**
 * Vercel Ignored Build Step: drosselt Deployments auf höchstens eines alle 5 Minuten.
 *
 * Vercel führt dieses Skript vor dem Build aus:
 *   Exit 0  → Build wird übersprungen
 *   Exit 1  → Build läuft weiter
 *
 * Wir vergleichen den Commit des aktuellen Deployments mit dem Commit des letzten
 * erfolgreichen Deployments (VERCEL_GIT_PREVIOUS_SHA). Liegen beide weniger als
 * fünf Minuten auseinander, wird dieser Zwischenstand übersprungen. Der nächste
 * Push nach Ablauf des Fensters deployt dann den aktuellen Stand inklusive der
 * übersprungenen Änderungen.
 *
 * Kein Token, keine Secrets: die Commit-Zeit kommt aus dem öffentlichen
 * GitHub-Patch-Endpunkt. Bei fehlenden Daten oder Netzwerkfehlern wird bewusst
 * gebaut (fail-open).
 */
const MIN_INTERVAL_SECONDS = 5 * 60;
const FETCH_TIMEOUT_MS = 8_000;

function build(reason) {
  console.log(`[deploy-throttle] build: ${reason}`);
  process.exit(1);
}

function skip(reason) {
  console.log(`[deploy-throttle] skip: ${reason}`);
  process.exit(0);
}

async function commitDate(owner, repo, sha) {
  const response = await fetch(`https://github.com/${owner}/${repo}/commit/${sha}.patch`, {
    headers: { 'User-Agent': 'moodmap-vercel-deploy-throttle' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const patch = await response.text();
  const match = patch.match(/^Date: (.+)$/m);
  if (!match) throw new Error('Date fehlt');
  const date = Date.parse(match[1]);
  if (!Number.isFinite(date)) throw new Error('Date ungültig');
  return date;
}

async function main() {
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;
  const current = process.env.VERCEL_GIT_COMMIT_SHA;
  const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;

  // Production (main) muss immer den neuesten Stand ausliefern. Gedrosselt werden
  // die vielen Preview-Deployments aus PR-Branches – die treiben das Tageslimit.
  if (process.env.VERCEL_ENV === 'production') build('Production wird immer gebaut');

  if (!owner || !repo || !current) build('Git-Metadaten fehlen');
  if (!previous || previous === current) build('kein vorheriger Deployment-Commit');

  let currentDate;
  let previousDate;
  try {
    [currentDate, previousDate] = await Promise.all([
      commitDate(owner, repo, current),
      commitDate(owner, repo, previous),
    ]);
  } catch (error) {
    build(`Commit-Zeit nicht abrufbar (${error?.message ?? 'Fehler'})`);
  }

  const deltaSeconds = (currentDate - previousDate) / 1000;
  if (deltaSeconds < MIN_INTERVAL_SECONDS) {
    skip(
      `${Math.round(deltaSeconds)} s seit dem letzten Deployment-Commit (Minimum ${MIN_INTERVAL_SECONDS} s)`,
    );
  }

  build(`${Math.round(deltaSeconds)} s seit dem letzten Deployment-Commit`);
}

await main();
