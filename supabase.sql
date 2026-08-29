-- HASHEMI FB / Supabase database
-- Run this in Supabase SQL Editor BEFORE using the app.
create extension if not exists pgcrypto;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  bio text default '',
  avatar_url text,
  family_id uuid references public.families(id) on delete set null,
  role text not null default 'member' check(role in ('member','admin')),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  image_url text,
  image_only boolean generated always as (content is null and image_url is not null) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz not null default now(),
  constraint message_content check(content is not null or image_url is not null)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.current_family_id() returns uuid
language sql stable security definer set search_path=public as $$
  select family_id from public.profiles where id=auth.uid()
$$;

create or replace function public.is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and family_id=fid and status='approved')
$$;

create or replace function public.is_admin(fid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and family_id=fid and role='admin' and status='approved')
$$;

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Profiles: users can see approved members of their family; users can update themselves.
create policy "profile read family" on public.profiles for select using (
  id=auth.uid() or (family_id=current_family_id() and status='approved') or public.is_admin(family_id)
);
create policy "profile insert self" on public.profiles for insert with check(id=auth.uid());
create policy "profile update self/admin" on public.profiles for update using(id=auth.uid() or public.is_admin(family_id));

-- Families: approved members can read their family; creation handled below by first-user flow.
create policy "family read member" on public.families for select using(id=current_family_id());

-- Posts
create policy "posts read family" on public.posts for select using(public.is_family_member((select family_id from profiles where id=author_id)));
create policy "posts insert own" on public.posts for insert with check(author_id=auth.uid() and public.is_family_member(current_family_id()));
create policy "posts delete own/admin" on public.posts for delete using(author_id=auth.uid() or public.is_admin((select family_id from profiles where id=author_id)));

-- Likes
create policy "likes read family" on public.likes for select using(public.is_family_member((select family_id from profiles where id=user_id)));
create policy "likes insert own" on public.likes for insert with check(user_id=auth.uid() and public.is_family_member((select family_id from profiles where id=user_id)));
create policy "likes delete own" on public.likes for delete using(user_id=auth.uid());

-- Comments
create policy "comments read family" on public.comments for select using(public.is_family_member((select family_id from profiles where id=author_id)));
create policy "comments insert own" on public.comments for insert with check(author_id=auth.uid() and public.is_family_member((select family_id from profiles where id=author_id)));
create policy "comments delete own/admin" on public.comments for delete using(author_id=auth.uid() or public.is_admin((select family_id from profiles where id=author_id)));

-- Messages: only sender/receiver can access
create policy "messages read participants" on public.messages for select using(sender_id=auth.uid() or receiver_id=auth.uid());
create policy "messages insert sender" on public.messages for insert with check(sender_id=auth.uid());
create policy "messages delete sender" on public.messages for delete using(sender_id=auth.uid());

-- Notifications
create policy "notifications own read" on public.notifications for select using(user_id=auth.uid());
create policy "notifications own update" on public.notifications for update using(user_id=auth.uid());

-- Storage bucket
insert into storage.buckets (id,name,public) values ('family-media','family-media',true)
on conflict(id) do nothing;

create policy "family media read" on storage.objects for select using(bucket_id='family-media');
create policy "family media upload" on storage.objects for insert with check(bucket_id='family-media' and auth.uid() is not null);
create policy "family media delete own folder" on storage.objects for delete using(bucket_id='family-media' and auth.uid()::text = (storage.foldername(name))[2]);

-- Automatic profile after signup. Family is selected by metadata family_code.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare fid uuid;
begin
  select id into fid from public.families where code = new.raw_user_meta_data->>'family_code';
  insert into public.profiles(id,full_name,email,phone,family_id)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name','عضو خانواده'),new.email,new.raw_user_meta_data->>'phone',fid)
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Counters for UI
alter table public.posts add column if not exists like_count integer not null default 0;
alter table public.posts add column if not exists comment_count integer not null default 0;

create or replace function public.refresh_post_counts() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.posts p set
    like_count=(select count(*) from public.likes l where l.post_id=p.id),
    comment_count=(select count(*) from public.comments c where c.post_id=p.id)
  where p.id=coalesce(new.post_id,old.post_id);
  return coalesce(new,old);
end $$;
drop trigger if exists likes_count on public.likes;
create trigger likes_count after insert or delete on public.likes for each row execute procedure public.refresh_post_counts();
drop trigger if exists comments_count on public.comments;
create trigger comments_count after insert or delete on public.comments for each row execute procedure public.refresh_post_counts();

-- Realtime
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.messages;

-- IMPORTANT FIRST SETUP:
-- Create one family manually:
-- insert into public.families(name,code) values('خانواده هاشمی','HASHEMI-2026');
-- Then register the first account using that code.
-- After registration, in Table Editor > profiles set that user's role='admin', status='approved'.
