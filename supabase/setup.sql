# Supabase setup for TaskPay evidence photos
# Safe to re-run (idempotent)

create table if not exists evidence_photos (
  id bigint generated always as identity primary key,
  task_id bigint not null,
  uploader_address text not null,
  photo_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists evidence_photos_task_id_idx on evidence_photos (task_id);

alter table evidence_photos enable row level security;

drop policy if exists "Allow public read evidence_photos" on evidence_photos;
create policy "Allow public read evidence_photos"
  on evidence_photos for select
  using (true);

drop policy if exists "Allow anon insert evidence_photos" on evidence_photos;
create policy "Allow anon insert evidence_photos"
  on evidence_photos for insert
  with check (true);

drop policy if exists "Allow anon delete evidence_photos" on evidence_photos;
create policy "Allow anon delete evidence_photos"
  on evidence_photos for delete
  using (true);

-- Optional text answers (photo and/or text evidence)
create table if not exists task_answers (
  id bigint generated always as identity primary key,
  task_id bigint not null,
  uploader_address text not null,
  answer_text text not null,
  answer_url text,
  updated_at timestamptz not null default now(),
  unique (task_id, uploader_address)
);

create index if not exists task_answers_task_id_idx on task_answers (task_id);

alter table task_answers enable row level security;

drop policy if exists "Allow public read task_answers" on task_answers;
create policy "Allow public read task_answers"
  on task_answers for select
  using (true);

drop policy if exists "Allow anon insert task_answers" on task_answers;
create policy "Allow anon insert task_answers"
  on task_answers for insert
  with check (true);

drop policy if exists "Allow anon update task_answers" on task_answers;
create policy "Allow anon update task_answers"
  on task_answers for update
  using (true);

drop policy if exists "Allow anon delete task_answers" on task_answers;
create policy "Allow anon delete task_answers"
  on task_answers for delete
  using (true);

-- Storage bucket: public bucket for evidence images
insert into storage.buckets (id, name, public)
values ('task-evidence', 'task-evidence', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public read task-evidence" on storage.objects;
create policy "Allow public read task-evidence"
  on storage.objects for select
  using (bucket_id = 'task-evidence');

drop policy if exists "Allow anon upload task-evidence" on storage.objects;
create policy "Allow anon upload task-evidence"
  on storage.objects for insert
  with check (bucket_id = 'task-evidence');

drop policy if exists "Allow anon update task-evidence" on storage.objects;
create policy "Allow anon update task-evidence"
  on storage.objects for update
  using (bucket_id = 'task-evidence');

drop policy if exists "Allow anon delete task-evidence" on storage.objects;
create policy "Allow anon delete task-evidence"
  on storage.objects for delete
  using (bucket_id = 'task-evidence');

-- Welcome network-fee grants (one claim per wallet — USDC for MiniPay, CELO for browser)
create table if not exists welcome_claims (
  address text primary key,
  tx_hash text not null,
  amount_wei text not null,
  claimed_at timestamptz not null default now()
);

create index if not exists welcome_claims_claimed_at_idx on welcome_claims (claimed_at);

alter table welcome_claims enable row level security;

drop policy if exists "Allow public read welcome_claims" on welcome_claims;
create policy "Allow public read welcome_claims"
  on welcome_claims for select
  using (true);

drop policy if exists "Allow anon insert welcome_claims" on welcome_claims;
create policy "Allow anon insert welcome_claims"
  on welcome_claims for insert
  with check (true);
