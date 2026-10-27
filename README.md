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

## Backend

```bash
cd backend
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

Optional: set `OPENAI_API_KEY` in `.env`. Defaults: `OPENAI_WRITER_MODEL=gpt-4o-mini`, `OPENAI_REVIEWER_MODEL=gpt-4o` (override either in `.env`).

## Frontend

```bash
cd frontend
npm install
npm start
```

Search examples: `my radiator is dripping`, `Is the moon landing real?`
