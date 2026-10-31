-- Photo Match: a phone reference photo per subject is used to sort gallery photos by child.
-- Biometric data: consent required before matching; references and vectors are purged when a gallery closes.

alter table subjects
  add column match_consent boolean not null default false,
  add column match_consent_at timestamptz,
  add column match_consent_by text;          -- parent/guardian name or school admin

create table subject_references (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects on delete cascade,
  storage_key text not null,                 -- private bucket, never served to clients
  face_id text,                              -- id returned by the matching engine's face collection
  created_at timestamptz not null default now()
);

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
alter table photo_matches enable row level security;

create policy own_references on subject_references for all
  using (subject_id in (select s.id from subjects s join galleries g on g.id = s.gallery_id where g.photographer_id = auth.uid()));
create policy own_matches on photo_matches for all
  using (subject_id in (select s.id from subjects s join galleries g on g.id = s.gallery_id where g.photographer_id = auth.uid()));
