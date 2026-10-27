# google-killer

Mind-map search: **route in the database (zero LLM tokens)**, **generate once** when a topic is new, then reuse the same rabbit hole for paraphrases.

## Flow

1. Normalize query → `intentSignature` (stems + synonym groups).
2. Hit an existing `SearchQuery` or fuzzy-match a hole’s vocabulary → load nodes from Postgres.
3. On a true miss → **Writer → Reviewer → Overseer** pipeline (OpenAI if `OPENAI_API_KEY` is set, else offline template), with a generation lock on `intentSignature`.

### Generation agents (first visit only)

| Role | Job |
|------|-----|
| **Writer** | Drafts the mind-map JSON |
| **Reviewer** | Checks answer fit, spine, safety; may patch the graph |
| **Overseer** | Validates schema, accepts/rejects, sends revision notes (max rounds) |

Repeat searches never call these — they only load from the DB.

## Vercel Services (Beta)

One project, two services — see root [`vercel.json`](vercel.json):

| Service | Public? | Path |
|---------|---------|------|
| **frontend** | yes | `/` (SPA) |
| **backend** | yes | `/api/*` only (Express) |

The React app calls **`/api/search`** and **`/api/nodes/:id`** on the same domain (no binding needed in the browser).

Local all-in-one: `npx vercel dev` from repo root, or:

```bash
npm run dev
```

Set Vercel project env: `DATABASE_URL`, `OPENAI_API_KEY`, optional writer/reviewer models.

## Backend (local)

```bash
cd backend
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

API base: `http://localhost:3001/api`

Optional: set `OPENAI_API_KEY` in `.env`. Defaults: `OPENAI_WRITER_MODEL=gpt-4o-mini`, `OPENAI_REVIEWER_MODEL=gpt-4o`.

## Frontend (local)

```bash
cd frontend
npm install
npm start
```

Uses `frontend/.env.development` → `REACT_APP_API_URL=http://localhost:3001/api`

Search examples: `my radiator is dripping`, `Is the moon landing real?`
