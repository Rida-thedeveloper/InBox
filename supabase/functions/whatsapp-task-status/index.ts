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
    const shouldDelete = body.delete === true;
    const status = body.status;
    const priority = typeof body.priority === 'string' ? body.priority.toLowerCase() : undefined;
    if (!taskId) return jsonResponse({ error: 'A task ID is required.' }, 400);

    if (shouldDelete) {
      const { data, error } = await createAdminClient()
        .from('whatsapp_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw new Error('Could not delete this WhatsApp task.');
      if (!data) return jsonResponse({ error: 'This task was not found for your account.' }, 404);
      return jsonResponse({ ok: true, id: data.id, deleted: true });
    }

    const update: Record<string, string> = {};
    if (status !== undefined) {
      if (!['pending', 'approved', 'dismissed'].includes(status)) {
        return jsonResponse({ error: 'Status must be pending, approved, or dismissed.' }, 400);
      }
      update.status = status;
    }
    if (priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(priority)) return jsonResponse({ error: 'Priority must be low, medium, or high.' }, 400);
      update.priority = priority;
    }
    if (!Object.keys(update).length) return jsonResponse({ error: 'An allowed task change is required.' }, 400);

    const { data, error } = await createAdminClient()
      .from('whatsapp_tasks')
      .update(update)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved', 'dismissed'])
      .select('id,status,priority')
      .maybeSingle();
    if (error) throw new Error('Could not update this WhatsApp task.');
    if (!data) return jsonResponse({ error: 'This task was not found for your account.' }, 404);
    return jsonResponse({ ok: true, id: data.id, status: data.status, priority: data.priority });
  } catch (error) {
    console.error('whatsapp-task-status failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'Could not update this WhatsApp task.' }, 500);
  }
});
