/**
 * Request headers for Supabase Edge Functions with public anon/publishable keys (#195).
 *
 * `sb_publishable_*` keys are not JWTs and must never be sent as `Authorization: Bearer`.
 * The functions are deployed with `--no-verify-jwt`; they enforce participation, the one-attempt
 * moderation claim and the reset PIN server-side. Legacy anon-JWT keys still work as Bearer.
 */
export function edgeFunctionHeaders(anonKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  };
  if (!anonKey.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${anonKey}`;
  return headers;
}
