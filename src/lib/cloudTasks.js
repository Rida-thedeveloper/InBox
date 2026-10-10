import { supabase } from './supabase';

const TABLE = 'manual_inbox_tasks';

export async function loadCloudManualTasks(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('task_data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.task_data).filter(Boolean);
}

export async function saveCloudManualTask(userId, task) {
  if (!supabase || !userId) throw new Error('Sign in to sync tasks with Supabase.');
  const { error } = await supabase.from(TABLE).upsert({
    id: String(task.id),
    user_id: userId,
    task_data: task,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteCloudManualTask(userId, taskId) {
  if (!supabase || !userId) throw new Error('Sign in to delete this task from Supabase.');
  const { data, error } = await supabase.from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('id', String(taskId))
    .select('id');
  if (error) throw error;
  if (!data?.some((row) => row.id === String(taskId))) {
    throw new Error('Supabase did not confirm deleting this task. Check that the database migration has been applied.');
  }
}
