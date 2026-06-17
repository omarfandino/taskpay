# Supabase setup for TaskPay evidence photos
# Run in Supabase SQL editor

create table if not exists evidence_photos (
  id bigint generated always as identity primary key,
  task_id bigint not null,
  uploader_address text not null,
  photo_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists evidence_photos_task_id_idx on evidence_photos (task_id);

-- Storage bucket: create "task-evidence" as public in Supabase Dashboard
-- Policy: allow public read, authenticated/anon upload for hackathon MVP

alter table evidence_photos enable row level security;

create policy "Allow public read evidence_photos"
  on evidence_photos for select
  using (true);

create policy "Allow anon insert evidence_photos"
  on evidence_photos for insert
  with check (true);
