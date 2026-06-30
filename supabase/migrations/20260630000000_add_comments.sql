-- Inline comments for text documents (RFCs).
-- Documents are publicly readable by anon, so comments are too; writes are
-- restricted to the comment author, with resolve also allowed to the doc owner.

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  doc_id text not null,
  thread_id uuid not null,
  parent_id uuid,
  author_id uuid not null,
  author_name text not null,
  body text not null,
  anchor jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table comments enable row level security;

-- SELECT: public (anyone with the doc link can read comments).
create policy "comments_select_public" on comments
  for select using (true);

-- INSERT: authenticated and author_id = auth.uid().
create policy "comments_insert_own" on comments
  for insert with check (auth.uid() = author_id);

-- UPDATE: the author, or the document owner (so owners can resolve threads).
create policy "comments_update_own_or_owner" on comments
  for update using (
    auth.uid() = author_id
    or exists (
      select 1 from documents d
      where d.id = comments.doc_id and d.user_id = auth.uid()
    )
  );

-- DELETE: the author only.
create policy "comments_delete_own" on comments
  for delete using (auth.uid() = author_id);

create index if not exists comments_doc_id_idx on comments (doc_id);
