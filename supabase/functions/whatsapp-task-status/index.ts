import { createAdminClient, getAuthenticatedUser, jsonResponse } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Unauthorized.' }, 401);

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : '';
    const status = body.status;
    if (!taskId || !['approved', 'dismissed'].includes(status)) {
      return jsonResponse({ error: 'A task ID and approved/dismissed status are required.' }, 400);
    }

    const { data, error } = await createAdminClient()
      .from('whatsapp_tasks')
      .update({ status })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
      .select('id,status')
      .maybeSingle();
    if (error) throw new Error('Could not update this WhatsApp task.');
    if (!data) return jsonResponse({ error: 'This task was not found for your account.' }, 404);
    return jsonResponse({ ok: true, id: data.id, status: data.status });
  } catch (error) {
    console.error('whatsapp-task-status failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'Could not update this WhatsApp task.' }, 500);
  }
});