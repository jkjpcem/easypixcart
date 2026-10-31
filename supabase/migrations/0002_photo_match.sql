-- Photo Match: a phone reference photo per subject is used to sort gallery photos by child.
create extension if not exists vector;

-- Biometric data: consent required before matching; references and vectors are purged when a gallery closes.

alter table subjects
  add column match_consent boolean not null default false,
  add column match_consent_at timestamptz,
  add column match_consent_by text;          -- parent/guardian name or school admin

create table subject_references (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects on delete cascade,
  storage_key text not null,                 -- private bucket, never served to clients
  embedding vector(512),                     -- ArcFace-style face vector from the local matcher
  created_at timestamptz not null default now()
);

-- One row per face detected in a gallery photo; matching compares these to subject_references.
create table photo_faces (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references photos on delete cascade,
  embedding vector(512) not null,
  box jsonb                                  -- {x,y,w,h} for cropping/review UI
);

create index on photo_faces (photo_id);

create table photo_matches (
  photo_id uuid not null references photos on delete cascade,
  subject_id uuid not null references subjects on delete cascade,
  confidence real not null,
  status text not null default 'auto' check (status in ('auto','needs_review','confirmed','rejected')),
  primary key (photo_id, subject_id)
);

create index on photo_matches (subject_id, status);

alter table galleries add column match_status text not null default 'off'
  check (match_status in ('off','pending','running','done'));

alter table subject_references enable row level security;
alter table photo_faces enable row level security;
alter table photo_matches enable row level security;

create policy own_references on subject_references for all
  using (subject_id in (select s.id from subjects s join galleries g on g.id = s.gallery_id where g.photographer_id = auth.uid()));
create policy own_matches on photo_matches for all
  using (subject_id in (select s.id from subjects s join galleries g on g.id = s.gallery_id where g.photographer_id = auth.uid()));
create policy own_faces on photo_faces for all
  using (photo_id in (select p.id from photos p join galleries g on g.id = p.gallery_id where g.photographer_id = auth.uid()));
