import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client de leitura — usa anon key, respeita RLS
export const supabase = createClient(url, anon);

// Client de escrita — usa service role, bypassa RLS (só no servidor)
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não definida');
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
