-- EasyPixCart core schema. Photographers own galleries; clients buy through a gallery access code.

create extension if not exists "pgcrypto";

create table photographers (
  id uuid primary key references auth.users on delete cascade,
  studio_name text not null,
  currency text not null default 'usd',
  stripe_account_id text,
  created_at timestamptz not null default now()
);

-- A gallery is one shoot / event / school day / team.
create table galleries (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers on delete cascade,
  title text not null,
  slug text not null unique,
  access_code text,                       -- null = public link
  event_date date,
  expires_at timestamptz,
  price_list_id uuid,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_at timestamptz not null default now()
);

-- Optional subjects inside a gallery (a student, a team member) for school/sports workflows.
create table subjects (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries on delete cascade,
  name text not null,
  group_label text,                       -- class, team, homeroom
  access_code text,                       -- per-family code
  email text
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries on delete cascade,
  subject_id uuid references subjects on delete set null,
  original_key text not null,             -- private storage path
  preview_key text,                       -- watermarked, resized
  thumb_key text,
  width int, height int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table price_lists (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers on delete cascade,
  name text not null
);
alter table galleries add foreign key (price_list_id) references price_lists;

create table products (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references price_lists on delete cascade,
  kind text not null check (kind in ('print','digital','canvas','package','download')),
  name text not null,
  size_label text,
  price_cents int not null check (price_cents >= 0),
  sort_order int not null default 0
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries,
  subject_id uuid references subjects,
  customer_email text not null,
  customer_name text,
  shipping jsonb,
  total_cents int not null,
  stripe_payment_intent text unique,
  status text not null default 'pending'
    check (status in ('pending','paid','in_production','shipped','complete','refunded')),
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  photo_id uuid not null references photos,
  product_id uuid not null references products,
  quantity int not null default 1 check (quantity > 0),
  unit_price_cents int not null
);

create index on photos (gallery_id, sort_order);
create index on orders (gallery_id, status);

-- RLS: photographers see only their own rows. Client access goes through server routes using the service role.
alter table photographers enable row level security;
alter table galleries enable row level security;
alter table subjects enable row level security;
alter table photos enable row level security;
alter table price_lists enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy own_profile on photographers for all using (id = auth.uid());
create policy own_galleries on galleries for all using (photographer_id = auth.uid());
create policy own_subjects on subjects for all using (gallery_id in (select id from galleries where photographer_id = auth.uid()));
create policy own_photos on photos for all using (gallery_id in (select id from galleries where photographer_id = auth.uid()));
create policy own_price_lists on price_lists for all using (photographer_id = auth.uid());
create policy own_products on products for all using (price_list_id in (select id from price_lists where photographer_id = auth.uid()));
create policy own_orders on orders for select using (gallery_id in (select id from galleries where photographer_id = auth.uid()));
create policy own_order_items on order_items for select using (order_id in (select id from orders where gallery_id in (select id from galleries where photographer_id = auth.uid())));
