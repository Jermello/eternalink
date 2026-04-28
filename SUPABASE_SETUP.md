# Supabase Setup — EternaLink

This app needs a Supabase project for the database (memorials & photos) and Storage (photo uploads). Follow these steps from scratch.

---

## 1. Create a Supabase project

1. Go to https://supabase.com and sign in (free tier is enough for the MVP).
2. Click **New project** → choose an org, project name (e.g. `eternalink`), pick a strong DB password, and a region close to your users.
3. Wait ~1 minute for the project to provision.

---

## 2. Get your API credentials

> Supabase migrated to a new key system. The legacy `anon` and `service_role`
> JWTs are replaced by **Publishable** and **Secret** keys with the prefixes
> `sb_publishable_…` and `sb_secret_…`. EternaLink supports both — but use the
> new ones for any new project.

In the Supabase dashboard:

1. Open **Project Settings → API Keys**.
2. Copy:
   - **Project URL** (under *Project Settings → Data API*) → `NEXT_PUBLIC_SUPABASE_URL`.
   - **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Safe to ship to the browser.
   - **Secret key** (`sb_secret_…`) → `SUPABASE_SECRET_KEY`. Server-only, never expose to the client. Used by the admin and family pages to bypass RLS for trusted writes.

If your project still shows only the legacy `anon` and `service_role` JWTs, click **Generate new keys** (or **Migrate to new API keys**) at the top of the page and use the new pair.

Then create a `.env.local` file in the repo root (copy `.env.local.example`):

```bash
cp .env.local.example .env.local
```

You also need an **admin password**. The `/admin` dashboard is gated by it (a signed httpOnly cookie issued after sign-in). Generate one with:

```bash
openssl rand -base64 32
```

…and paste it into `ADMIN_PASSWORD`. Rotating this value invalidates every existing admin session.

Restart `next dev` after changing env vars.

---

## 3. Create the database schema

In the Supabase dashboard, open **SQL Editor → New query**, paste the SQL below, and click **Run**.

```sql
-- ───────────────────────────────────────────────────────────────────
-- EternaLink schema
-- ───────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- memorials ----------------------------------------------------------
create table if not exists public.memorials (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  hebrew_name         text not null default '',
  hebrew_parent_name  text not null default '',
  -- 'male' → renders "<name> בן <parent>" in the prayer
  -- 'female' → renders "<name> בת <parent>"
  gender              text not null default 'male'
                      check (gender in ('male', 'female')),
  civil_name          text not null default '',
  biography           text not null default '',
  death_date          date,
  hebrew_death_date   text not null default '',
  cover_photo_url     text not null default '',
  profile_photo_url   text not null default '',
  family_token        text not null unique,
  is_published        boolean not null default false,
  created_at          timestamptz not null default now()
);

-- Migrations for projects created before banner/profile/parent-name/gender support.
-- Safe to run on a fresh DB too (no-ops thanks to "if not exists").
alter table public.memorials
  add column if not exists cover_photo_url     text not null default '',
  add column if not exists profile_photo_url   text not null default '',
  add column if not exists hebrew_parent_name  text not null default '',
  add column if not exists gender              text not null default 'male';

-- Lock down legal values for `gender`. Existing rows are already 'male' (the
-- default), so adding the constraint is safe. Drop+recreate keeps the
-- migration idempotent.
alter table public.memorials drop constraint if exists memorials_gender_check;
alter table public.memorials
  add constraint memorials_gender_check
  check (gender in ('male', 'female'));

create index if not exists memorials_slug_idx on public.memorials (slug);
create index if not exists memorials_token_idx on public.memorials (family_token);

-- photos -------------------------------------------------------------
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  memorial_id  uuid not null references public.memorials(id) on delete cascade,
  image_url    text not null,
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists photos_memorial_idx
  on public.photos (memorial_id, position);

-- ───────────────────────────────────────────────────────────────────
-- Row Level Security
-- ───────────────────────────────────────────────────────────────────
-- The app uses the service_role key on the server for all writes
-- (admin + family edits via token). Public reads are only allowed
-- for published memorials and their photos.
-- ───────────────────────────────────────────────────────────────────

alter table public.memorials enable row level security;
alter table public.photos    enable row level security;

drop policy if exists "Public can read published memorials"  on public.memorials;
drop policy if exists "Public can read photos of published"  on public.photos;

create policy "Public can read published memorials"
  on public.memorials for select
  using (is_published = true);

create policy "Public can read photos of published"
  on public.photos for select
  using (
    exists (
      select 1 from public.memorials m
      where m.id = photos.memorial_id and m.is_published = true
    )
  );
```

---

## 4. Create the Storage bucket

In the Supabase dashboard, open **Storage → New bucket**:

- **Name:** `memorial-photos`
- **Public bucket:** **Yes** (so QR-code visitors can load images directly).
- File size limit: 5 MB is plenty.
- Allowed MIME types: `image/*`.

Then go to **Storage → Policies → memorial-photos** and add a SELECT policy that allows anonymous reads (Supabase will offer a one-click "Allow public read access" template). Uploads/deletes are done from the server with the service-role key, so no anon write policy is required.

If you prefer SQL, you can run this instead:

```sql
-- Public read for the bucket
insert into storage.buckets (id, name, public)
values ('memorial-photos', 'memorial-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read memorial-photos" on storage.objects;

create policy "Public read memorial-photos"
  on storage.objects for select
  using (bucket_id = 'memorial-photos');
```

---

## 5. Verify

1. `npm run dev`
2. Open http://localhost:3000/admin → create a test memorial.
3. Click the family-edit link, add a bio + a photo, then publish.
4. Open `/m/<slug>` — you should see the public page with Psalm 119 sections matching the Hebrew name.

If env vars are missing, the app will show a friendly setup screen instead of crashing.
