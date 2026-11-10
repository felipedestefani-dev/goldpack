-- Goldpack — schema do catálogo
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
--
-- Depois:
-- 1. Authentication → Users → Add user (e-mail e senha).
-- 2. Copie o UUID do usuário e execute:
--    insert into public.admins (user_id) values ('cole-o-uuid-aqui');
-- 3. Em js/config.js, cole a Project URL e a chave anon.
--    Nunca use a service_role no site.

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('sealed', 'single', 'accessory')),
  game text not null default '',
  collection text not null default '',
  collection_code text not null default '',
  card_number text not null default '',
  language text not null default 'PT-BR',
  condition text not null default 'NM',
  finish text not null default 'Normal',
  rarity text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  compare_at numeric(12, 2) check (compare_at is null or compare_at >= 0),
  stock integer not null default 0 check (stock >= 0),
  tag text not null default '',
  badge text not null default '',
  image_url text not null default '',
  description text not null default '',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_created_idx
  on public.products (active, created_at desc);

create index if not exists products_kind_idx on public.products (kind);
create index if not exists products_collection_idx on public.products (collection);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins enable row level security;
alter table public.products enable row level security;

drop policy if exists "read own admin row" on public.admins;
create policy "read own admin row"
  on public.admins
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "public reads active products" on public.products;
create policy "public reads active products"
  on public.products
  for select
  to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists "admins insert products" on public.products;
create policy "admins insert products"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins update products" on public.products;
create policy "admins update products"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete products" on public.products;
create policy "admins delete products"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.admins to authenticated;

insert into storage.buckets (id, name, "public")
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "product images are public" on storage.objects;
create policy "product images are public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'products');

drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'products' and public.is_admin());

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  image_url text not null default '',
  link text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.banners add column if not exists image_mobile_url text not null default '';

create table if not exists public.store_tabs (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null default '#/',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ip text not null default '',
  path text not null default '',
  referrer text not null default '',
  user_agent text not null default ''
);

-- Uma visita por IP por dia (horário de Brasília).
alter table public.visits add column if not exists visit_day date;
update public.visits set visit_day = (created_at at time zone 'America/Sao_Paulo')::date where visit_day is null;
alter table public.visits alter column visit_day set default (now() at time zone 'America/Sao_Paulo')::date;
alter table public.visits alter column visit_day set not null;
delete from public.visits v
  using public.visits older
  where v.ip <> '' and v.ip = older.ip and v.visit_day = older.visit_day
    and (older.created_at, older.id) < (v.created_at, v.id);
create unique index if not exists visits_one_per_ip_per_day on public.visits (ip, visit_day) where ip <> '';

alter table public.banners enable row level security;
alter table public.store_tabs enable row level security;
alter table public.visits enable row level security;

drop policy if exists "public reads active banners" on public.banners;
create policy "public reads active banners"
  on public.banners for select to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists "admins write banners" on public.banners;
create policy "admins write banners"
  on public.banners for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public reads active tabs" on public.store_tabs;
create policy "public reads active tabs"
  on public.store_tabs for select to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists "admins write tabs" on public.store_tabs;
create policy "admins write tabs"
  on public.store_tabs for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "anyone inserts a visit" on public.visits;
create policy "anyone inserts a visit"
  on public.visits for insert to anon, authenticated
  with check (true);

drop policy if exists "admins read visits" on public.visits;
create policy "admins read visits"
  on public.visits for select to authenticated
  using (public.is_admin());

grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;
grant select on public.store_tabs to anon, authenticated;
grant insert, update, delete on public.store_tabs to authenticated;
grant insert on public.visits to anon, authenticated;
grant select on public.visits to authenticated;

insert into public.store_tabs (label, href, sort_order)
select seed.label, seed.href, seed.sort_order
from (
  values
    ('Início', '#/', 0),
    ('Catálogo', '#/catalog', 1),
    ('Lacrados', '#/catalog?kind=sealed', 2),
    ('Avulsos', '#/catalog?kind=single', 3),
    ('Acessórios', '#/catalog?kind=accessory', 4),
    ('Contato', '#/contato', 5)
) as seed(label, href, sort_order)
where not exists (select 1 from public.store_tabs);
