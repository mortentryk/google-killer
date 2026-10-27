# google-killer

Mind-map search: **route in the database (zero LLM tokens)**, **generate once** when a topic is new, then reuse the same rabbit hole for paraphrases.

## Flow

1. Normalize query → `intentSignature` (stems + synonym groups).
2. Hit an existing `SearchQuery` or fuzzy-match a hole’s vocabulary → load nodes from Postgres.
3. On a true miss → one call to `generateRabbitHoleGraph` (OpenAI if `OPENAI_API_KEY` is set, else offline template), with a generation lock on `intentSignature`.

## Backend

```bash
cd backend
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

Optional: set `OPENAI_API_KEY` in `.env` for real AI graphs on first visit.

## Frontend

```bash
cd frontend
npm install
npm start
```

Search examples: `my radiator is dripping`, `Is the moon landing real?`
