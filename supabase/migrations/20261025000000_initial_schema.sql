-- Reson initial schema (PRD §8, diterjemahkan ke Postgres).
-- RLS aktif di semua tabel. Tanpa policy = ditolak. Mutasi sosial (post, komentar,
-- like, follow, join, block, match, moderasi, hapus akun) lewat fungsi SECURITY DEFINER
-- yang ditambahkan di T03+; klien tidak diberi policy tulis untuk tabel tersebut.

create type account_status as enum ('active', 'suspended', 'deleting');
create type post_type as enum ('discussion', 'question', 'review', 'showcase');
create type post_status as enum ('published', 'hidden', 'deleted');
create type app_role as enum ('user', 'moderator', 'admin');
create type report_status as enum ('open', 'dismissed', 'actioned');

-- Profil publik. Email/preferensi privat TIDAK di sini.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default '' check (char_length(display_name) <= 50),
  bio text not null default '' check (char_length(bio) <= 300),
  avatar_path text,
  status account_status not null default 'active',
  follower_count int not null default 0 check (follower_count >= 0),
  following_count int not null default 0 check (following_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Data privat pemilik + role (role hanya bisa diubah server).
create table accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  role app_role not null default 'user',
  onboarding_completed boolean not null default false,
  intro_seen boolean not null default false,
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table sound_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  genres text[] not null default '{}' check (cardinality(genres) <= 5),
  bass smallint check (bass between 1 and 5),       -- null = belum tahu
  vocals smallint check (vocals between 1 and 5),
  treble smallint check (treble between 1 and 5),
  contexts text[] not null default '{}',
  discoverable boolean not null default true,
  schema_version int not null default 1,
  revision int not null default 1,
  updated_at timestamptz not null default now()
);

create table communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  cover_path text,
  rules text[] not null default '{}',
  status text not null default 'active',
  member_count int not null default 0 check (member_count >= 0),
  created_at timestamptz not null default now()
);

create table community_members (
  community_id uuid not null references communities (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index on community_members (user_id, joined_at desc);

create table devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_lower text generated always as (lower(name)) stored,
  brand text not null,
  category text not null,
  image_path text,
  specs jsonb not null default '{}'::jsonb,
  source_url text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index on devices (name_lower text_pattern_ops);

create table posts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique,                              -- idempotensi retry
  author_id uuid not null references profiles (id) on delete cascade,
  community_id uuid not null references communities (id),
  type post_type not null,
  title text not null check (char_length(title) <= 120),
  title_lower text generated always as (lower(title)) stored,
  body text not null default '' check (char_length(body) <= 5000),
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 4),
  device_ids uuid[] not null default '{}',
  details jsonb not null default '{}'::jsonb,          -- field review/setup (PRD §8.1)
  status post_status not null default 'published',
  like_count int not null default 0 check (like_count >= 0),
  comment_count int not null default 0 check (comment_count >= 0),
  has_answers boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on posts (status, created_at desc, id desc);
create index on posts (community_id, status, created_at desc, id desc);
create index on posts (author_id, status, type, created_at desc);
create index on posts using gin (device_ids);
create index on posts (title_lower text_pattern_ops);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  parent_comment_id uuid references comments (id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  status post_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on comments (post_id, created_at);

create table post_likes (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  following_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index on follows (following_id, created_at desc);

create table saved_posts (
  user_id uuid not null references profiles (id) on delete cascade,
  post_id uuid not null references posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table device_lists (
  user_id uuid not null references profiles (id) on delete cascade,
  device_id uuid not null references devices (id) on delete cascade,
  owned boolean not null default false,
  wanted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

create table blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,                      -- ID deterministik anti-duplikat
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('follow', 'comment', 'reply')),
  actor_id uuid references profiles (id) on delete set null,
  post_id uuid references posts (id) on delete set null,
  comment_id uuid references comments (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

create table match_results (
  user_id uuid not null references profiles (id) on delete cascade,
  candidate_id uuid not null references profiles (id) on delete cascade,
  score real not null,
  coverage real not null,
  label text not null,
  shared_genres text[] not null default '{}',
  shared_preferences text[] not null default '{}',
  differences text[] not null default '{}',
  algorithm_version int not null,
  viewer_revision int not null,
  candidate_revision int not null,
  computed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, candidate_id)
);

create table device_suggestions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references profiles (id) on delete cascade,
  name text not null,
  brand text not null,
  source_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) <= 500),
  status report_status not null default 'open',
  moderator_id uuid references profiles (id),
  resolution text,
  created_at timestamptz not null default now()
);

create table moderation_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null,
  target_id uuid not null,
  reason text,
  created_at timestamptz not null default now()
);

-- Helper role (dipakai policy moderator di T11).
create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts where id = auth.uid() and role in ('moderator', 'admin'));
$$;

-- RLS: aktifkan semua, lalu beri policy baca/tulis minimum yang aman.
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table sound_profiles enable row level security;
alter table communities enable row level security;
alter table community_members enable row level security;
alter table devices enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table post_likes enable row level security;
alter table follows enable row level security;
alter table saved_posts enable row level security;
alter table device_lists enable row level security;
alter table blocks enable row level security;
alter table notifications enable row level security;
alter table match_results enable row level security;
alter table device_suggestions enable row level security;
alter table reports enable row level security;
alter table moderation_audit enable row level security;

-- Baca untuk akun login (v1 wajib login).
create policy profiles_read on profiles for select to authenticated using (status = 'active' or id = auth.uid());
create policy communities_read on communities for select to authenticated using (status = 'active');
create policy devices_read on devices for select to authenticated using (status = 'active');
create policy posts_read on posts for select to authenticated using (status = 'published');
create policy comments_read on comments for select to authenticated using (
  status = 'published' and exists (select 1 from posts p where p.id = post_id and p.status = 'published')
);
create policy members_read on community_members for select to authenticated using (user_id = auth.uid());
create policy follows_read on follows for select to authenticated using (true);

-- Data milik sendiri.
create policy accounts_own_read on accounts for select to authenticated using (id = auth.uid());
create policy sound_own_read on sound_profiles for select to authenticated using (
  user_id = auth.uid() or discoverable
);
create policy saved_own on saved_posts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy device_lists_own on device_lists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy blocks_own_read on blocks for select to authenticated using (blocker_id = auth.uid());
create policy notifications_own_read on notifications for select to authenticated using (user_id = auth.uid());
create policy match_own_read on match_results for select to authenticated using (user_id = auth.uid());
create policy reports_own_read on reports for select to authenticated using (reporter_id = auth.uid() or is_staff());
create policy suggestions_own_read on device_suggestions for select to authenticated using (submitted_by = auth.uid());

-- Tulis langsung dibatasi ke kolom aman lewat GRANT kolom (counter/status/role server-only).
revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant update (display_name, bio, avatar_path) on profiles to authenticated;
grant insert, update, delete on saved_posts, device_lists to authenticated;
create policy profiles_update_own on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Mark-as-read notifikasi: hanya kolom read_at.
grant update (read_at) on notifications to authenticated;
create policy notifications_own_read_at on notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
