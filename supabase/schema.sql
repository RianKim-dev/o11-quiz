-- O11 Quiz — Supabase schema
-- Run this once in your Supabase project: SQL Editor → paste → Run.
-- Stores per-user progress only; questions live in the app (content/questions/*.json).

-- ============ answers (full attempt history) ============
create table if not exists public.answers (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  question_id text        not null,
  chosen      text        not null default '',
  correct     boolean     not null,
  subtopic    text        not null,
  category    text        not null,
  mode        text        not null,
  created_at  timestamptz not null default now()
);

alter table public.answers enable row level security;

drop policy if exists "answers are private to their owner" on public.answers;
create policy "answers are private to their owner"
  on public.answers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists answers_user_question_idx
  on public.answers (user_id, question_id);

-- ============ bookmarks (⭐ revisit later) ============
create table if not exists public.bookmarks (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  question_id text        not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks are private to their owner" on public.bookmarks;
create policy "bookmarks are private to their owner"
  on public.bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
