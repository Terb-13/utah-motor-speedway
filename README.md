# Wildfire Raceway — site

Static marketing pages (HTML, Tailwind CDN, shared [`css/site.css`](css/site.css) and [`js/site.js`](js/site.js)) plus Vercel Node serverless routes under [`api/`](api/) for Supabase inserts and the xAI Grok chat proxy.

## Current status

- **StoryBrand copy** is aligned with `utah-motor-speedway-updated-storybrand-copy.md` on the home page and experience pages (including Rocket Rally and Private Garages).
- **Booking modal** posts to **`POST /api/bookings`** → Supabase table **`bookings`**; success and error states are shown in the modal.
- **Garage waitlist** on `garages/index.html` posts to **`POST /api/waitlist`** → **`garage_waitlist`**; success and error states are supported.
- **Member Concierge** is a **floating chat widget** on every page (see `js/site.js` + `css/site.css`); it calls **`POST /api/chat`** with the API key server-side (`XAI_API_KEY`).
- **Mobile sticky bar** and primary CTAs match across pages (Book Your Experience + Talk to Us).

## Project layout

| Path | Purpose |
|------|--------|
| `index.html`, `track/`, `karting/`, `rocket-rally/`, `events/`, `garages/` | Public pages |
| `css/site.css`, `js/site.js` | Shared styles and behavior |
| `api/*.js` | Vercel functions at `/api/*` (includes `api/admin/*` for the dashboard) |
| `admin/` | Vite + React source for `/admin` |
| `admin-build/` | Build output (gitignored; produced by `npm run build:admin`) |
| `.env.example` | Variable names for local and Vercel |

## Environment variables

Copy `.env.example` to **`.env.local`** for `vercel dev`. Set real values in the Vercel dashboard for Production / Preview.

| Variable | Scope | Purpose |
|----------|--------|---------|
| `SUPABASE_URL` | Server (`/api/bookings`, `/api/waitlist`) | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Inserts into `bookings` and `garage_waitlist` (bypasses RLS — never expose to the browser) |
| `XAI_API_KEY` | Server (`/api/chat`) | Grok API key |
| `XAI_MODEL` | Optional server | Defaults to `grok-2-latest` |
| `SITE_URL` | Optional | Canonical URL helpers |
| `ADMIN_DASHBOARD_PASSWORD` | Server (`/api/admin/*`) | Password for `/admin` dashboard login |
| `ADMIN_SESSION_SECRET` | Optional server | Cookie signing secret (defaults to `ADMIN_DASHBOARD_PASSWORD`) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Optional (Vite dev) | Browser Supabase client for future auth/RLS features |

### Admin dashboard (`/admin`)

React + Vite app in [`admin/`](admin/) (gold-on-charcoal UI, FullCalendar, bookings/waitlist tables). Build output goes to **`admin-build/`**; Vercel rewrites `/admin` → that bundle.

- **Local UI:** `npm install` then `npm run dev:admin` (defaults API proxy to `http://127.0.0.1:3000` — run **`vercel dev`** in another terminal so `/api/admin/*` exists).
- **Production:** set `ADMIN_DASHBOARD_PASSWORD` on Vercel; deploy runs `npm run vercel-build` (builds admin + keeps static marketing files).

### Non-root deployments

If the site is served from a subpath, set on `<body>`:

```html
<body data-api-base="https://your-domain.com/subpath">
```

(`data-api-base` should have **no** trailing slash.)

## Supabase schema

Run in the SQL editor (adjust types/policies as needed):

```sql
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  experience_type text not null check (experience_type in ('track-day', 'karting', 'rocket-rally')),
  preferred_date date not null,
  party_size int not null check (party_size >= 1 and party_size <= 999),
  full_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz default now()
);

create table public.garage_waitlist (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  notes text,
  created_at timestamptz default now()
);
```

Because the APIs use the **service role**, you can keep RLS enabled with no public policies on these tables, or add policies if you later call Supabase from the browser with the anon key.

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | `GET` | Health check |
| `/api/bookings` | `POST` | JSON body → insert `bookings` |
| `/api/waitlist` | `POST` | JSON body → insert `garage_waitlist` |
| `/api/chat` | `POST` | `{ "messages": [{ "role","content" }] }` → Grok |

## Local development

Install dependencies and run the Vercel dev server so `/api/*` works:

```bash
npm install
npx vercel dev
```

Static-only preview (no API):

```bash
python3 -m http.server 8080
```

## Deploy on Vercel

1. Connect the repo; **Framework Preset**: Other (no framework build required).
2. Add environment variables from `.env.example`.
3. Deploy. Static files are served from the repo root; `api/` becomes `/api/*`.

## Next steps

- Point social links in the footer to real Instagram / Facebook / YouTube URLs.
- Add monitoring or logging for API routes (e.g. Vercel logs, Supabase dashboard).
- Optional: rate limiting on `/api/chat` and form endpoints.
- Optional: confirmation emails via Supabase Edge Functions or a transactional provider.

## License / content

© Wildfire Raceway. Copy and imagery are for the venue; update footer links and legal text as needed.
