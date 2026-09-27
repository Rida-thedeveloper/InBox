import { createAdminClient, decryptTokens, getAuthenticatedUser, jsonResponse } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Unauthorized.' }, 401);
    const admin = createAdminClient();
    const { data: connection, error: readError } = await admin.from('gmail_connections').select('encrypted_tokens,tokens_iv').eq('user_id', user.id).maybeSingle();
    if (readError) throw new Error('Could not read connection.');
    if (connection) {
      const tokens = await decryptTokens(connection.encrypted_tokens, connection.tokens_iv);
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: tokens.refresh_token }),
      }).catch(() => undefined);
      const { error: deleteError } = await admin.from('gmail_connections').delete().eq('user_id', user.id);
      if (deleteError) throw new Error('Could not remove the stored connection.');
    }
    return jsonResponse({ disconnected: true });
  } catch (error) {
    console.error('gmail-disconnect failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'Could not disconnect Gmail.' }, 500);
  }
});
