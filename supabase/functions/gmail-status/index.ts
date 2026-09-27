import { createAdminClient, getAuthenticatedUser, jsonResponse } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Unauthorized.' }, 401);
    const { data, error } = await createAdminClient().from('gmail_connections').select('gmail_email,connected_at').eq('user_id', user.id).maybeSingle();
    if (error) throw new Error('Could not load connection status.');
    return jsonResponse({ connected: Boolean(data), email: data?.gmail_email || null, connectedAt: data?.connected_at || null });
  } catch (error) {
    console.error('gmail-status failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'Could not load Gmail connection status.' }, 500);
  }
});
