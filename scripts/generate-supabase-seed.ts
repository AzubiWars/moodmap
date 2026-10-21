/**
 * Writes supabase/seed.sql – master data + survey config for Supabase (#93).
 * Sources: public/geo/*.geojson (#6), public/data/schools.json (#7), src/data/topics.ts (#5).
 * Usage: npm run db:seed:build   (then `npm run supabase -- db reset` locally)
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSeedSql, loadSeedSources } from './lib/supabase-seed.ts';

const sources = loadSeedSources();
writeFileSync(fileURLToPath(new URL('../supabase/seed.sql', import.meta.url)), buildSeedSql(sources));
console.log(
  `supabase/seed.sql: ${sources.schools.length} schools, ${sources.questions.length} questions, ${sources.waves.length} waves`,
);
