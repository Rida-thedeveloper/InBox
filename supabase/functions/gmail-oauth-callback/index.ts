import { appRedirectWithResult, callbackError, createAdminClient, decryptTokens, encryptTokens, GOOGLE_CALLBACK_URL, GOOGLE_SCOPE, hashState } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method !== 'GET') return callbackError('Method not allowed.', 405);
  const url = new URL(req.url);
  const state = url.searchParams.get('state');
  if (!state) return callbackError('Missing OAuth state. Restart Gmail connection from the app.');

  const admin = createAdminClient();
  const stateHash = await hashState(state);
  const { data: stateRows, error: consumeError } = await admin.rpc('consume_gmail_oauth_state', { p_state_hash: stateHash });
  const stateRecord = Array.isArray(stateRows) ? stateRows[0] : stateRows;
  if (consumeError || !stateRecord?.user_id || !stateRecord?.redirect_uri || !stateRecord?.code_verifier) return callbackError('This Gmail authorization link expired or was already used. Restart the connection from the app.');
  const redirectUri = stateRecord.redirect_uri as string;

  const providerError = url.searchParams.get('error');
  if (providerError) return Response.redirect(appRedirectWithResult(redirectUri, { gmail: 'error', reason: 'consent_denied' }), 302);

  const code = url.searchParams.get('code');
  if (!code) return Response.redirect(appRedirectWithResult(redirectUri, { gmail: 'error', reason: 'missing_code' }), 302);

  try {
    const clientId = Deno.env.get('GOOGLE_GMAIL_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_GMAIL_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Gmail OAuth server secrets are not configured.');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
        code_verifier: stateRecord.code_verifier,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Google token exchange failed.');

    const { data: existing } = await admin.from('gmail_connections').select('encrypted_tokens,tokens_iv').eq('user_id', stateRecord.user_id).maybeSingle();
    let refreshToken = tokenData.refresh_token;
    if (!refreshToken && existing?.encrypted_tokens && existing?.tokens_iv) {
      refreshToken = (await decryptTokens(existing.encrypted_tokens, existing.tokens_iv)).refresh_token;
    }
    if (!refreshToken) throw new Error('Google did not return a refresh token. Revoke the existing app access in Google Account settings, then reconnect.');

    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.emailAddress) throw new Error('Could not verify the Gmail account.');

    const encrypted = await encryptTokens({ access_token: tokenData.access_token, refresh_token: refreshToken });
    const { error: saveError } = await admin.from('gmail_connections').upsert({
      user_id: stateRecord.user_id,
      gmail_email: profile.emailAddress,
      encrypted_tokens: encrypted.encryptedTokens,
      tokens_iv: encrypted.iv,
      token_expires_at: new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000).toISOString(),
      granted_scope: tokenData.scope || GOOGLE_SCOPE,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (saveError) throw new Error('Could not securely save the Gmail connection.');

    return Response.redirect(appRedirectWithResult(redirectUri, { gmail: 'connected' }), 302);
  } catch (error) {
    console.error('gmail-oauth-callback failed:', error instanceof Error ? error.message : 'unknown error');
    return Response.redirect(appRedirectWithResult(redirectUri, { gmail: 'error', reason: 'connection_failed' }), 302);
  }
});
