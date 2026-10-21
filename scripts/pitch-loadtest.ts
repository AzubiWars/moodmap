/** Run only by the operator against an isolated, empty Pitch round. See docs/PITCH_LOADTEST.md. */
import { LoadTestError, runPitchLoadTest } from './lib/pitch-loadtest.ts';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(
    'Usage: npm run pitch:loadtest -- --synthetic-pitch [--reset-after]\n200 synthetic participants / 120 s, 60 moderation calls. Requires MOODMAP_LOADTEST_URL, MOODMAP_LOADTEST_ANON_KEY (anon JWT), and MOODMAP_LOADTEST_RESET_PIN for --reset-after. See docs/PITCH_LOADTEST.md.',
  );
} else if (
  !args.includes('--synthetic-pitch') ||
  args.some((arg) => !['--synthetic-pitch', '--reset-after'].includes(arg))
) {
  console.error('Explicit --synthetic-pitch required; only --reset-after is optional. See --help.');
  process.exitCode = 1;
} else {
  try {
    const result = await runPitchLoadTest({
      url: process.env.MOODMAP_LOADTEST_URL ?? '',
      anonKey: process.env.MOODMAP_LOADTEST_ANON_KEY ?? '',
      joinCode: process.env.MOODMAP_LOADTEST_JOIN_CODE ?? 'PITCH',
      resetAfter: args.includes('--reset-after'),
      resetPin: process.env.MOODMAP_LOADTEST_RESET_PIN,
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } catch (error) {
    // Fixed codes only: fetch errors can contain URLs/credentials; never print stack or request bodies.
    console.error(
      JSON.stringify({
        passed: false,
        error: error instanceof LoadTestError ? error.message : 'loadtest_failed',
      }),
    );
    process.exitCode = 1;
  }
}
