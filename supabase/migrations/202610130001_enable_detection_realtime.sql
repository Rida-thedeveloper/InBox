-- Let signed-in InBox clients refresh immediately when detections change elsewhere.
do $$
declare
  target_table text;
begin
  foreach target_table in array array['pending_inbox_detections', 'whatsapp_tasks'] loop
    if to_regclass(format('public.%I', target_table)) is not null
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = target_table
      ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end
$$;