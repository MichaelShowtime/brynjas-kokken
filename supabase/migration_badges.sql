-- Kør denne SQL i Supabase Dashboard → SQL Editor

create table if not exists user_badges (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  badge_id   text        not null,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table user_badges enable row level security;

create policy "læs egne badges"
  on user_badges for select
  using (auth.uid() = user_id);

create policy "tilføj egne badges"
  on user_badges for insert
  with check (auth.uid() = user_id);
