import { createAdminClient, jsonResponse } from '../_shared/gmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-inbox-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, corsHeaders);

  const expectedSecret = Deno.env.get('N8N_GMAIL_INGEST_SECRET');
  const userId = Deno.env.get('N8N_INBOX_USER_ID');
  if (!expectedSecret || !userId) {
    console.error('Missing N8N_GMAIL_INGEST_SECRET or N8N_INBOX_USER_ID.');
    return jsonResponse({ error: 'Webhook is not configured.' }, 503, corsHeaders);
  }
  if (req.headers.get('x-inbox-webhook-secret') !== expectedSecret) {
    return jsonResponse({ error: 'Unauthorized.' }, 401, corsHeaders);
  }

  try {
    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
    const source = typeof body.source === 'string' && body.source.trim()
      ? body.source.trim().slice(0, 100)
      : 'Gmail';
    const messageId = typeof body.message_id === 'string' ? body.message_id.trim().slice(0, 500) : '';
    if (!title || !messageId) return jsonResponse({ error: 'title and message_id are required.' }, 400, corsHeaders);

    const row = {
      user_id: userId,
      source,
      source_channel: source,
      message_id: messageId,
      title,
      description: typeof body.description === 'string' ? body.description.slice(0, 2000) : '',
      context_text: typeof body.context_text === 'string' ? body.context_text.slice(0, 5000) : '',
      date_time: typeof body.date_time === 'string' ? body.date_time.slice(0, 200) : null,
      priority: ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium',
    };
    const { data, error } = await createAdminClient()
      .from('pending_inbox_detections')
      .upsert(row, { onConflict: 'user_id,message_id', ignoreDuplicates: true })
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return jsonResponse({ ok: true, duplicate: !data, id: data?.id || null }, 200, corsHeaders);
  } catch (error) {
    console.error('n8n-gmail-detection failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'Could not save detected task.' }, 500, corsHeaders);
  }
});
