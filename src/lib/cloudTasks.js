import { supabase } from './supabase';

const TABLE = 'manual_inbox_tasks';
const DELETED_TABLE = 'deleted_manual_inbox_tasks';

export async function loadCloudDeletedManualTaskIds(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from(DELETED_TABLE)
    .select('task_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((row) => String(row.task_id));
}

export async function loadCloudManualTasks(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('id,task_data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const deletedIds = new Set(await loadCloudDeletedManualTaskIds(userId));
  return (data || []).filter((row) => !deletedIds.has(String(row.id))).map((row) => row.task_data).filter(Boolean);
}

export async function saveCloudManualTask(userId, task) {
  if (!supabase || !userId) throw new Error('Sign in to sync tasks with Supabase.');
  const { data, error } = await supabase.rpc('save_manual_inbox_task', {
    target_task_id: String(task.id),
    target_task_data: task,
  });
  if (error) throw error;
  if (data !== true) throw new Error('Supabase did not confirm saving this task.');
}

export async function deleteCloudManualTask(userId, taskId, { requireMatch = true } = {}) {
  if (!supabase || !userId) throw new Error('Sign in to delete this task from Supabase.');
  const { data, error } = await supabase.rpc('delete_manual_inbox_task', { target_task_id: String(taskId) });
  if (error) throw error;
  if (requireMatch && data !== true) {
    throw new Error('Supabase did not confirm deleting this task. Check that the database migration has been applied.');
  }
}
