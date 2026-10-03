<div align="center">

<img src="/public/logo.svg" alt="Blindspot" width={180} height={180} />

### Find local businesses that don't have a website.

A **lead finder** for agencies selling websites to local businesses. Search a niche + location, get the ones with no online presence, and draft the outreach in one click.

Blindspot geocodes your search, queries OpenStreetMap, filters by contact richness, and writes the cold pitch for you.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-Overpass-7EBC6F?style=flat-square&logo=openstreetmap&logoColor=white)](https://overpass-api.de/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Node-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

</div>

---

## Why Blindspot?

Most lead lists are stale, paid, and full of businesses that already hired an agency. Blindspot reads the map instead: OpenStreetMap tells you who's real, and missing `contact:website` tells you who needs you.

> "The best lead list is the one the map already keeps up to date."

---

## Features

### Niche + Location Search

Type `restaurant` or `dentist` — or an Overpass filter like `amenity=cafe, shop=beauty` — plus any town. Blindspot geocodes the place, queries Overpass, and caps results at your chosen limit.

### Websiteless Filter

One checkbox narrows the table to businesses with no website — the actual pitch. Contact info is sorted by richness, so the leads with phone/WhatsApp/email you can reach sit at the top.

### One-Click Outreach

Click a lead's name and an LLM drafts a WhatsApp message, email subject, and body tuned to that specific business — never inventing details, never copying the lead's own contact info back at them.

### Saved Searches

Every search persists per user (`userId + niche + location`). The sidebar replays past searches from storage without re-querying Overpass.

### Export CSV

Dump the current view to CSV for your sequencer or spreadsheet.

### And more

- **Dual LLM backend** — OpenRouter cloud by default, or a local `llama.cpp` server, same code path via `LLM_BASE_URL`
- **Auth built-in** — better-auth with email verification, forgot/reset password, sessions
- **Self-checks** — `node src/lib/leads.check.ts` asserts the Overpass query builder, niche parser, and result parser without a network
- **No keyless spam** — malformed niches are rejected before they reach the Overpass API

---

## Quick Start

### Prerequisites

- Node.js 20+
- A Postgres database
- (Optional) `OPENROUTER_API_KEY` for outreach drafts, or a local `llama.cpp` server

### Run it

```bash
git clone https://github.com/uxlabspk/blindspot.git
cd blindspot
npm install
cp .env.example .env
```

Fill in `.env` (see [Configuration](#configuration)):

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and search.

**Self-checks:**
```bash
node src/lib/leads.check.ts
node src/lib/llm.check.ts
```

> **Coverage note** — OpenStreetMap data is patchy. A town with no mapped cafés returns nothing; try a broader niche or a larger nearby town.

---

## How it works

```
You type niche + location
    ↓
Nominatim               Geocodes the location to a bbox
    ↓
resolveNiche            Preset name → Overpass tags, or pass a raw filter through
    ↓
Overpass API            nwr[tag=value](bbox) → nodes/ways/relations with tags
    ↓
parseOverpass           Keeps named leads near the center, sorts by contact richness
    ↓
Postgres (Prisma)       Upserts the Search row (results as jsonb), returns leads
    ↓
Dashboard table         Websiteless filter → Export CSV → outreach modal
    ↓
LLM (OpenRouter / llama.cpp)  Drafts WhatsApp + email JSON for one lead
```

**Replay:** clicking a saved search fetches `/api/search?id=…` and returns the stored `results` blob — no geocode, no Overpass round trip.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 16** (App Router) + **React 19** |
| Data | **OpenStreetMap** — Nominatim geocoding + Overpass queries |
| Database | **Postgres** via **Prisma 7** |
| Auth | **better-auth** — sessions, email verification, password reset |
| Outreach | **OpenRouter** cloud or local **llama.cpp** (OpenAI-compatible) |
| Email | **nodemailer** (SMTP) |
| Styling | **Tailwind CSS 4** |

---

## Project Structure

```
blindspot/
├── src/app/
│   ├── page.tsx             Landing page
│   ├── (auth)/              Login, signup, verify, forgot/reset password
│   ├── dashboard/
│   │   ├── page.tsx         Server component — auth gate + load saved searches
│   │   └── leads.tsx        Client UI — search form, results table, outreach modal
│   └── api/
│       ├── search/          Geocode → Overpass → persist → return leads
│       ├── outreach/        LLM outreach draft for one lead
│       └── auth/            better-auth catch-all
├── src/lib/
│   ├── leads.ts             Lead types, niche presets, Overpass build/parse
│   ├── leads.check.ts       Self-check for the above
│   ├── llm.ts               Outreach prompt + JSON parser (cloud or local)
│   ├── llm.check.ts         Self-check for the parser
│   ├── auth.ts              better-auth config
│   ├── email.ts             SMTP helper
│   └── prisma.ts            Prisma client
├── prisma/schema.prisma     User, Session, Account, Verification, Search
└── .env.example             All environment variables
```

---

## Configuration

All settings live in `.env`:

| Setting | Default | Description |
|---------|---------|-------------|
| `DATABASE_URL` | — | Postgres connection string |
| `BETTER_AUTH_SECRET` | — | Session signing secret |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Public URL of the app |
| `SMTP_URL` | — | `smtp://user:pass@host:587` for verification/reset mail |
| `SMTP_FROM` | `Blindspot <no-reply@localhost>` | From header |
| `LLM_BASE_URL` | OpenRouter | Swap for `http://127.0.0.1:8080/v1` to go local |
| `LLM_MODEL` | `openrouter/auto` | Model name as served by the endpoint |
| `OPENROUTER_API_KEY` | — | Key for the cloud path (not needed locally) |

---

## Contributing

Blindspot is early. Contributions welcome.

1. Fork it
2. Create a branch (`git checkout -b feat/my-thing`)
3. Commit (`git commit -m 'Add my thing'`)
4. Push (`git push origin feat/my-thing`)
5. Open a PR

---

**If Blindspot lands you even one client, give it a star.**

It helps others find it, and tells me this is worth continuing.

[⭐ Star this repo](https://github.com/uxlabspk/blindspot/stargazers)
