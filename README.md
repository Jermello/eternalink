# EternaLink

A respectful Jewish digital memorial. Each memorial has:

- A public page (`/m/[slug]`) reached by scanning a QR plaque.
- A private family-edit page (`/family/[token]`) — no login, gated by an unguessable token.
- An admin dashboard (`/admin`) to create memorials and toggle publication.
- A dynamically generated reading from **Psalm 119**, where each section is selected by the Hebrew letters of the deceased's name.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase (Postgres + Storage), and `qrcode`.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Set up Supabase (see SUPABASE_SETUP.md for the full walk-through)
cp .env.local.example .env.local
# … then paste your Supabase URL, anon key, and service-role key

# 3. Run
npm run dev
```

Then:

1. Open http://localhost:3000/admin → create a memorial.
2. Copy the family-edit link the dashboard shows you.
3. Open it, fill in the biography + Hebrew name, upload photos.
4. Click **Publish** in the admin.
5. Open `/m/[slug]` — the QR-friendly memorial page.

The QR PNG for any slug is available at `/api/qr/[slug]` (size with `?size=512`).

---

## Project structure

```
app/
  page.tsx                  Landing page
  layout.tsx                Root layout, Hebrew typography
  m/[slug]/page.tsx         Public memorial page (QR destination)
  family/[token]/page.tsx   Token-gated edit page
  admin/page.tsx            Admin dashboard
  api/qr/[slug]/route.ts    QR PNG endpoint
components/
  MemorialHeader.tsx
  PhotoGallery.tsx
  PsalmSection.tsx
  EditForm.tsx
  SetupNotice.tsx
lib/
  supabase.ts               Anon + service-role clients (lazy, env-tolerant)
  queries.ts                Server-only read helpers
  actions.ts                Server actions for admin + family edits
  psalm119.ts               Hebrew letter → Psalm section mapping
  utils.ts                  Slug + token generators, date formatters
SUPABASE_SETUP.md           Step-by-step Supabase setup + SQL schema
```

---

## Architecture notes

- **No user auth.** The family-edit URL contains a 24-byte random token (`crypto.randomBytes(24).toString("base64url")`) that acts as a bearer credential. Anyone with the link can edit. This is the explicit MVP scope.
- **RLS.** The `memorials` and `photos` tables have RLS policies that allow anonymous reads only of *published* rows. All writes go through Server Actions using the service-role key on the server.
- **Two Supabase clients.** `getPublicSupabase()` (anon) is used for the public memorial page; `getServiceSupabase()` (service-role) for token lookups and writes. The latter is server-only.
- **Graceful first-run.** If env vars are missing the app shows a `SetupNotice` instead of crashing.
- **Psalm 119 content.** The repository ships with the canonical opening verse of each of the 22 sections (Masoretic text, public domain). To deploy the full reading, populate the remaining 7 verses per section in `lib/psalm119.ts` from any standard Tehillim source (e.g. Sefaria's `/api/texts/Psalms.119?lang=he`). The display logic already supports 1..N verses per section.
- **No payments** — out of scope for the MVP.

---

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Add the three env vars from `.env.local.example` to the Vercel project. Use Supabase's new key naming: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser) and `SUPABASE_SECRET_KEY` (server only — *not* `NEXT_PUBLIC_`).
4. Optional: set `NEXT_PUBLIC_SITE_URL` to your final domain so QR codes encode the right hostname.
5. Deploy.

---

## Scripts

```bash
npm run dev      # next dev (with Turbopack)
npm run build    # production build
npm run start    # serve a built app
npm run lint     # ESLint
```
