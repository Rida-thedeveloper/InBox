-- Accept provider labels supplied by n8n (for example "Gmail" and "Google Calendar").
alter table public.pending_inbox_detections
  drop constraint if exists pending_inbox_detections_source_check;
