# hackloneliness

> Curing the 10 PM isolation. Real meetups, real conversations, with an AI companion who actually gets you.

**hackloneliness** is a mobile-first social platform for young adults, international students, and expats fighting loneliness in Western cities. It blends the UI elegance of Hinge, the utility of Meetup, and an empathetic AI companion named **Lyanna** into one privacy-first product. The pitch: open the app at 10 PM when no one's around, see who else is bored within walking distance, and end up grabbing a tea with a real human ninety minutes later.

```
"I'm bored, who wants to go clubbing tonight?"
"Grabbing matcha at UTS, who's around?"
"Just finished a long shift, looking for someone to grab a quiet tea and vent."
```

---

## What's in here

### 🌟 Echoes
Text, photo, and video posts that feel like Instagram for your inner life. Mixed-media feed, profile grid, 50 MB videos via Supabase Storage.

### 🧭 Proximity feed
Activities discovered by **distance**, not algorithm. PostGIS-powered `nearby_activities` RPC returns open meetups within a 5 km radius, ordered by start time. Distance chips ("280 m", "1.2 km") on every card.

### 🔒 Private check-in flow
Discovery is public; **joining is gated**. Attendees see title / time / category / host but the **exact pin is hidden** until the host approves them and explicitly reveals the location.

```
Request to join  →  Host approves  →  DM unlocks  →  Chat to vibe-check
              →  Host reveals location  →  QR check-in at the meetup
```

### 💜 Lyanna — the AI companion
A draggable floating button on every screen. Powered by OpenRouter with a free-model failover chain (Llama 3.3 70B → DeepSeek → Qwen). Five roles: companion, gentle psychologist, social coach, motivator, faith-respecting life coach. Auto-fades when idle so she never blocks content.

### 🎯 Hinge-style onboarding
Twelve quick screens grouped into three sections (Basics, The Vibe, Inner State) collecting full name, DOB, education, occupation, faith, social battery, drinking/smoking, ideal weekend, intent, stress handling, and biggest barrier — then storing it in a flexible `ai_profile` JSONB so we can add more without migrations.

### 💬 Realtime chat
1:1 conversations via Supabase Realtime channels. Optimistic send, automatic dedup, message persistence.

### 🏷️ QR check-in + reputation
Hosts generate per-activity QR tokens. Attendees scan with their phone camera → check-in records hit `verification_logs` → reputation scores update via DB triggers.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server components, file-based routing |
| Runtime | **Bun** | Drop-in replacement for Node, ~3× faster cold start |
| Language | TypeScript 6 (strict) | Type safety across server + client |
| Styling | Tailwind CSS v3 | Mobile-first, consistent dark violet/indigo aesthetic |
| Database | Supabase (Postgres + PostGIS) | Auth, RLS, Realtime, Storage, geography queries |
| AI | OpenRouter | Free-tier LLMs with failover chain |

---

## Quick start

### 1. Clone & install

```bash
git clone https://github.com/MdRezanurRahman/hackloneliness.git
cd hackloneliness
bun install
```

### 2. Create a Supabase project

Make a new project at [supabase.com/dashboard](https://supabase.com/dashboard). You'll need:
- The project URL
- The publishable (anon) key — **Authentication** → **Providers** → **Email** → toggle **"Confirm email"** OFF for the demo flow

### 3. Set up environment

Copy `.env.example` → `.env` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

OPENROUTER_API_KEY=sk-or-v1-...                       # https://openrouter.ai/settings/keys
OPENROUTER_MODEL_1=z-ai/glm-4.5-air:free
OPENROUTER_MODEL_2=openai/gpt-oss-120b:free
OPENROUTER_MODEL_3=meta-llama/llama-3.3-70b-instruct:free

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run the SQL migrations

In Supabase **SQL Editor**, run each in order:

| File | What it does |
|---|---|
| `supabase/migrations/000_minimal_users.sql` | `users` + `ai_sessions` tables, RLS |
| `supabase/migrations/002_social.sql` | Posts, activities, attendees, verification, reputation, chat, Storage bucket |
| `supabase/migrations/003_postgis_location.sql` | PostGIS extension + auto-syncing `location` column + `nearby_activities` RPC |
| `supabase/migrations/004_echoes_and_deep_profile.sql` | Text/video Echoes + `users.full_name` |
| `supabase/migrations/005_join_request_flow.sql` | Private check-in flow (request → approve → reveal) |

### 5. Seed demo data (optional but recommended)

```sql
-- Run in Supabase SQL Editor — creates 5 sign-in-able accounts + 15 echoes
-- File: supabase/seeds/demo_accounts_and_echoes.sql

-- Optional: 3 hyper-local UTS meetups for the proximity demo
-- File: supabase/seeds/uts_demo.sql  (run while logged in as Aria)
```

### 6. Run dev

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo accounts

All five seeded accounts share password `Demo1234!`:

| Email | Persona | Use for |
|---|---|---|
| `aria@hackloneliness.app` | **Aria** — neuroscience PhD, outgoing | Hosting activities, managing requests |
| `jake@hackloneliness.app` | **Jake** — international student, lonely | The "quiet tea" demo target |
| `maya@hackloneliness.app` | **Maya** — extrovert, marketing intern | Clubbing flow |
| `sam@hackloneliness.app` | **Sam** — non-binary thesis writer | Study session flow |
| `priya@hackloneliness.app` | **Priya** — architect | Feed populator, profile variety |

Sign-in immediately works — no email confirmation required (provided you toggled "Confirm email" off in step 2).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Next.js 16 App Router (Bun)                        │
│  ┌─────────────────┬─────────────────────────────┐  │
│  │ Server Comps    │ Client Comps                │  │
│  │  /home          │  Lyanna chat (streaming)    │  │
│  │  /profile/[id]  │  Geolocation + RPC          │  │
│  │  /activities    │  Drag-to-park FAB           │  │
│  │  /messages      │  Realtime chat thread       │  │
│  └────────┬────────┴────────┬────────────────────┘  │
│           │                 │                        │
└───────────┼─────────────────┼────────────────────────┘
            │                 │
            ▼                 ▼
┌─────────────────────┐  ┌────────────────────────┐
│  Supabase           │  │  OpenRouter            │
│  ─ Postgres + RLS   │  │  ─ MODEL_1 → 2 → 3     │
│  ─ PostGIS          │  │  ─ SSE streaming       │
│  ─ Storage (50 MB)  │  │  ─ X-Model-Used header │
│  ─ Realtime         │  │                        │
│  ─ Auth (cookies)   │  └────────────────────────┘
└─────────────────────┘
```

### Key design decisions

- **Server-first auth gating.** Every protected page does `supabase.auth.getUser()` server-side and redirects unauthenticated users.
- **JSONB over migrations.** `users.ai_profile` holds the rich onboarding state (faith, social_battery, ideal_weekend, intent, …) so we can add fields without altering the schema.
- **PostGIS `BEFORE` trigger.** Application code only writes `latitude` / `longitude`; Postgres synthesizes the `geography` column. Zero client churn for spatial queries.
- **Failover at the edge.** Free OpenRouter models hit rate limits often; the chat route tries each model in sequence, only falling back on upstream errors *before* the stream opens.
- **Reference-stable callbacks.** Form primitives (chip grids, sliders, DOB picker) wrap `onChange` in a ref so a parent's fresh arrow on every render doesn't trigger child re-render storms.

---

## Project layout

```
app/
  page.tsx                    # Landing page
  auth/                       # Sign in / sign up / demo button
  onboarding/                 # 12-step Hinge-style form
  home/                       # Feed (proximity activities + echoes)
  echoes/new/                 # Tabbed text / photo / video composer
  activities/                 # Browse, host, join, manage
  profile/[id]                # Instagram-style profile + reputation
  profile/edit                # Full profile editor
  messages/                   # 1:1 realtime chat
  verify/[token]              # QR check-in landing
  api/onboarding/chat         # OpenRouter streaming endpoint

components/
  lyanna-chat.tsx             # Reusable chat UI
  lyanna-fab.tsx              # Draggable floating button
  bottom-nav.tsx              # 5-tab nav (Home, Activities, Echo+, Chat, Me)
  nearby-activities.tsx       # Geolocation-aware feed component
  profile-primitives.tsx      # ChipGrid, VicePicker, DobPicker, slider

lib/
  supabase/                   # Server + browser clients
  types/                      # database.ts + social.ts
  onboarding/form-schema.ts   # Faith / gender / mood / goal options

supabase/
  migrations/                 # 5 numbered migrations
  seeds/                      # demo_accounts_and_echoes.sql, uts_demo.sql
```

---

## Roadmap

What's done is in the codebase. What's next:

- **Lyanna voice mode** — Web Speech API hooked into the disabled mic icon for hands-free chat ("Hey Lyanna, I'm five minutes away…")
- **Proactive check-ins** — daily push notification + pre-canned Lyanna prompts ("How was the meetup last night?")
- **Per-attendee QR tokens** — currently one QR per activity; bind tokens to specific approved attendees
- **Reputation review modal** — UI for the existing `reputation_reviews` table
- **Faith-respecting nudges** — prayer time reminders, Sunday service prompts, atheist journaling rituals
- **Native mobile shell** — Capacitor wrapper for iOS / Android with native push

---

## License

MIT — fork it, ship it, make someone less lonely.

Built with care during the hackathon. You belong here.
