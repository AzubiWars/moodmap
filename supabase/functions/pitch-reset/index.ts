// Deno entry point; all HTTP/PIN/RPC behavior is tested in pitch-reset.test.ts.
import { createResetHandler } from './handler.ts';

Deno.serve(
  createResetHandler({
    pin: Deno.env.get('PITCH_RESET_PIN'),
    supabaseUrl: Deno.env.get('SUPABASE_URL'),
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    allowedOrigin: Deno.env.get('APP_URL') ?? 'https://moodmap-cyan.vercel.app',
  }),
);
