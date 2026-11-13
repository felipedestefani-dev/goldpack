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

-- Banner animado: desenhado pelo site a partir dos textos, com a imagem como arte.
alter table public.banners add column if not exists style text not null default 'image';
alter table public.banners add column if not exists tag text not null default '';
alter table public.banners add column if not exists highlight text not null default '';
alter table public.banners add column if not exists subtitle text not null default '';
alter table public.banners add column if not exists cta text not null default '';
alter table public.banners add column if not exists theme text not null default 'ouro';
alter table public.banners add column if not exists live boolean not null default false;
alter table public.banners add column if not exists socials boolean not null default false;
alter table public.banners drop constraint if exists banners_ad_ok;
alter table public.banners add constraint banners_ad_ok check (
  style in ('image', 'anim') and theme in ('ouro', 'roxo', 'claro', 'verde') and
  length(tag) <= 60 and length(highlight) <= 60 and length(subtitle) <= 60 and length(cta) <= 60
);

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

-- Qualquer pessoa com a chave pública pode inserir visitas: limita tamanho e formato no banco.
update public.visits set
  ip = case when ip ~ '^[0-9A-Fa-f.:]{3,45}$' then ip else '' end,
  path = left(path, 300),
  referrer = left(referrer, 500),
  user_agent = left(user_agent, 400)
where ip !~ '^([0-9A-Fa-f.:]{3,45})?$'
  or length(path) > 300 or length(referrer) > 500 or length(user_agent) > 400;
alter table public.visits drop constraint if exists visits_ip_format;
alter table public.visits add constraint visits_ip_format check (ip ~ '^([0-9A-Fa-f.:]{3,45})?$');
alter table public.visits drop constraint if exists visits_text_sizes;
alter table public.visits add constraint visits_text_sizes check (
  length(path) <= 300 and length(referrer) <= 500 and length(user_agent) <= 400
);

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

-- Ordem dos produtos na loja (setas na aba Produtos do painel). Começa do maior para o menor valor.
alter table public.products add column if not exists sort_order double precision;

update public.products p
set sort_order = ranked.position
from (
  select id, row_number() over (order by price desc, created_at desc) as position
  from public.products
) as ranked
where p.id = ranked.id and p.sort_order is null;

create index if not exists products_sort_order_idx on public.products (sort_order);

-- Aviso de live na Jamble: uma linha só, ligada e desligada pela aba Live do painel.
create table if not exists public.live_status (
  id smallint primary key default 1 check (id = 1),
  active boolean not null default false,
  started_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.live_status (id) values (1) on conflict (id) do nothing;

drop trigger if exists live_status_touch_updated_at on public.live_status;
create trigger live_status_touch_updated_at
  before update on public.live_status
  for each row execute function public.touch_updated_at();

alter table public.live_status enable row level security;

drop policy if exists "public reads live status" on public.live_status;
create policy "public reads live status"
  on public.live_status for select to anon, authenticated
  using (true);

drop policy if exists "admins update live status" on public.live_status;
create policy "admins update live status"
  on public.live_status for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.live_status to anon, authenticated;
grant update on public.live_status to authenticated;
