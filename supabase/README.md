# Gmail OAuth Edge Functions

The Expo app starts Gmail authorization through the authenticated `gmail-connect` function. Google returns the authorization code only to `gmail-oauth-callback`. The callback exchanges the code server-side, encrypts the access and refresh tokens with AES-256-GCM, and stores the ciphertext in a table that only `service_role` can read. The app can read only a connection status/email through `gmail-status` and can request revocation through `gmail-disconnect`.

## Required server secrets

Set these in Supabase Dashboard → Edge Functions → Secrets. Do not add them to Expo `EXPO_PUBLIC_...` variables or commit a local functions `.env` file.

- `GOOGLE_GMAIL_CLIENT_ID`
- `GOOGLE_GMAIL_CLIENT_SECRET`
- `GMAIL_TOKEN_ENCRYPTION_KEY`: a base64-encoded random 32-byte key (generate with `openssl rand -base64 32`). Keep a secure backup; losing this key makes stored Gmail tokens unrecoverable.

Supabase provides its project URL and server API key to hosted Edge Functions. The Google OAuth client must be a Web application client with this exact authorized redirect URI:

`https://unsfgyrcrspnplqvygbt.supabase.co/functions/v1/gmail-oauth-callback`

The app requests `openid`, `email`, and the read-only Gmail scope. Google classifies `gmail.readonly` as restricted and may require verification before public release.

## Apply and deploy

From the project directory, link the Supabase project if needed, apply the migrations, then deploy the Gmail functions and the n8n receiver:

```powershell
npx supabase login
npx supabase link --project-ref unsfgyrcrspnplqvygbt
npx supabase db push
npx supabase functions deploy gmail-connect
npx supabase functions deploy gmail-oauth-callback --no-verify-jwt
npx supabase functions deploy gmail-status
npx supabase functions deploy gmail-disconnect
npx supabase functions deploy n8n-gmail-detection --no-verify-jwt
```

The callback is the only unauthenticated function because Google redirects the browser there without an InBox session. It validates a short-lived, one-time, hashed OAuth state before using the code. All other functions require the signed-in user's Supabase JWT.

The Expo redirect allowlist accepts `inboxapp://integrations` and `http://localhost:8081/` for local web preview. Add an exact production app/web redirect to `allowedAppRedirect` before shipping a production build.

## n8n: send a detected Gmail task into InBox

Set two additional secrets in Supabase Dashboard → Edge Functions → Secrets:

- `N8N_GMAIL_INGEST_SECRET`: generate a long random value (at least 32 random bytes). Save it in a password manager, then enter that same value in n8n as the `x-inbox-webhook-secret` header. Do not put it in the Expo app or share it in chat.
- `N8N_INBOX_USER_ID`: the UUID for the intended InBox account, found in Supabase Dashboard → Authentication → Users. The webhook deliberately takes the destination user from this server secret, never from n8n's request body.

The n8n HTTP Request node named “Send Detected Task to InBox” should use:

- Method: `POST`
- URL: `https://unsfgyrcrspnplqvygbt.supabase.co/functions/v1/n8n-gmail-detection`
- Authentication: None
- Header: `x-inbox-webhook-secret` = the `N8N_GMAIL_INGEST_SECRET` value
- Header: `Content-Type` = `application/json`
- Body: JSON with `message_id` (Gmail message ID), `title` (required), `description`, `context_text`, `date_time` and optional `priority` (`low`, `medium`, or `high`). Example:

```json
{
  "message_id": "{{$json.id}}",
  "title": "Submit project proposal",
  "description": "Please send the proposal by Friday.",
  "context_text": "{{$json.snippet}}",
  "date_time": "Friday",
  "priority": "high"
}
```

After `npx supabase db push`, secret setup, and function deployment, send a test item from n8n. The response should be `{ "ok": true, ... }`. The signed-in app reads the pending row from Supabase; approving or dismissing it updates its status. The Gmail Trigger and any filtering/AI extraction nodes before this HTTP Request node must also be configured and active for real messages to flow automatically.

This flow connects and stores Gmail tokens securely. Background email detection still needs a separate Google Cloud Pub/Sub topic, Gmail `watch` subscription, and webhook processing/renewal.
