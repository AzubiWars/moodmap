/**
 * Supabase Edge Function: `submit-freetext` (#126, ADR-016).
 *
 * Replaces the public `moderate-text` endpoint from #119. It verifies that the device already
 * submitted the survey for the current wave, moderates the text and stores only the moderated
 * version via `record_freetext`. Without a valid participation no LLM request is made.
 *
 * Secrets (never in the repo/frontend):
 *   supabase secrets set OPENROUTER_API_KEY=...
 *   optional: OPENROUTER_MODEL=openai/gpt-4o-mini
 *
 * Deploy: supabase functions deploy submit-freetext
 */
import { submitFreetext } from '../_shared/submitFreetext.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, reason: 'method_not_allowed' }, 405);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid' }, 400);
  }

  const result = await submitFreetext(payload, {
    supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    openRouterKey: Deno.env.get('OPENROUTER_API_KEY'),
    openRouterModel: Deno.env.get('OPENROUTER_MODEL'),
    appUrl: Deno.env.get('APP_URL'),
  });

  return json(result.body, result.status);
});
