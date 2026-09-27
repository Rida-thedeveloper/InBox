import { allowedAppRedirect, createAdminClient, getAuthenticatedUser, hashState, jsonResponse, toBase64Url } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Sign in to InBox before connecting Gmail.' }, 401);
    const body = await req.json().catch(() => ({}));
    const redirectUri = body?.redirectUri;
    if (!allowedAppRedirect(redirectUri)) return jsonResponse({ error: 'Unsupported app redirect URI.' }, 400);

    const stateBytes = crypto.getRandomValues(new Uint8Array(32));
    const state = Array.from(stateBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
    const codeVerifier = toBase64Url(verifierBytes);
    const codeChallenge = toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))));
    const admin = createAdminClient();
    await admin.from('gmail_oauth_states').delete().lt('expires_at', new Date().toISOString());
    const { error: insertError } = await admin.from('gmail_oauth_states').insert({
      state_hash: await hashState(state),
      user_id: user.id,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (insertError) throw new Error('Could not create a Gmail authorization session.');

    const clientId = Deno.env.get('GOOGLE_GMAIL_CLIENT_ID');
    if (!clientId) throw new Error('Missing server configuration: GOOGLE_GMAIL_CLIENT_ID');
    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://unsfgyrcrspnplqvygbt.supabase.co/functions/v1/gmail-oauth-callback',
      response_type: 'code',
      scope: 'openid email https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    }).toString();

    return jsonResponse({ authorizationUrl: authorizationUrl.toString() });
  } catch (error) {
    console.error('gmail-connect failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'Gmail connection could not be started. Check the server function configuration.' }, 500);
  }
});
