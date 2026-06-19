-- Kør dette i Supabase Dashboard → SQL Editor

-- Kommentarer på posts
create table if not exists public.post_kommentarer (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  bruger_navn  text not null,
  bruger_avatar text,
  tekst        text not null,
  created_at   timestamptz not null default now()
);

alter table public.post_kommentarer enable row level security;

create policy "Alle kan læse kommentarer"
  on public.post_kommentarer for select using (true);

create policy "Bruger kan oprette kommentarer"
  on public.post_kommentarer for insert
  with check (auth.uid() = user_id);

create policy "Bruger kan slette egne kommentarer"
  on public.post_kommentarer for delete
  using (auth.uid() = user_id);

-- RLS-policies for posts (slet og rediger egne)
create policy "Bruger kan slette egne posts"
  on public.posts for delete
  using (auth.uid() = user_id);

create policy "Bruger kan redigere egne posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
