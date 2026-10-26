import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db/client';
import { resolveSearch, resolveTopicBySlug } from './search/resolveSearch';
import { listRecentSearches, recordSearchEvent } from './search/recentSearches';
import { appendJourneyStep, createJourney, getJourneyPublic } from './journey/journeyService';
import { rateLimit } from './middleware/rateLimit';
import { commentSpamGuard } from './middleware/commentSpam';
import { linkSpamGuard } from './middleware/linkSpam';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '32kb' }));

const searchLimiter = rateLimit({ prefix: 'search', windowMs: 60_000, max: 40 });
const recentSearchesLimiter = rateLimit({ prefix: 'searches-recent', windowMs: 60_000, max: 60 });
const commentReadLimiter = rateLimit({ prefix: 'comments-read', windowMs: 60_000, max: 120 });
const commentWriteLimiter = rateLimit({ prefix: 'comments-write', windowMs: 15 * 60_000, max: 20 });
const linkWriteLimiter = rateLimit({ prefix: 'links-write', windowMs: 15 * 60_000, max: 15 });
const journeyWriteLimiter = rateLimit({ prefix: 'journey-write', windowMs: 15 * 60_000, max: 80 });
const journeyReadLimiter = rateLimit({ prefix: 'journey-read', windowMs: 60_000, max: 120 });

app.get('/', (req, res) => {
    res.send('Rabbit Hole API is running');
});

app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true });
    } catch {
        res.status(503).json({ ok: false });
    }
});

app.get('/search', searchLimiter, async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        res.status(400).json({ error: 'Query parameter q is required' });
        return;
    }

    try {
        const result = await resolveSearch(q);
        if (!result) {
            res.status(400).json({ error: 'Enter a search query' });
            return;
        }
        void recordSearchEvent(result.displayQuery, result.slug).catch((err) => console.error(err));
        res.json(result);
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'Query is too long' ? 400 : 500;
        res.status(status).json({ error: message });
    }
});

app.get('/searches/recent', recentSearchesLimiter, async (req, res) => {
    const rawLimit = req.query.limit;
    const limit = typeof rawLimit === 'string' ? Number.parseInt(rawLimit, 10) : 12;
    try {
        const rows = await listRecentSearches(Number.isFinite(limit) ? limit : 12);
        res.json(
            rows.map((row) => ({
                id: row.id,
                displayQuery: row.displayQuery,
                slug: row.slug,
                createdAt: row.createdAt.toISOString(),
                commentCount: row.commentCount,
            }))
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/journeys', journeyWriteLimiter, async (_req, res) => {
    try {
        const journey = await createJourney();
        res.status(201).json({ id: journey.id, startedAt: journey.startedAt.toISOString() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/journeys/:id', journeyReadLimiter, async (req, res) => {
    const { id } = req.params;
    try {
        const journey = await getJourneyPublic(id);
        if (!journey) {
            res.status(404).json({ error: 'Rabbit hole not found' });
            return;
        }
        res.json({
            id: journey.id,
            startedAt: journey.startedAt.toISOString(),
            steps: journey.steps.map((s) => ({
                id: s.id,
                order: s.order,
                slug: s.slug,
                displayQuery: s.displayQuery,
                source: s.source,
                nodeId: s.nodeId,
                nodeTitle: s.node.title,
                timestamp: s.timestamp.toISOString(),
            })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/journeys/:id/steps', journeyWriteLimiter, async (req, res) => {
    const { id } = req.params;
    const body = req.body as {
        nodeId?: string;
        slug?: string;
        displayQuery?: string;
        source?: string;
    };
    if (!body.nodeId || !body.slug || !body.displayQuery) {
        res.status(400).json({ error: 'nodeId, slug, and displayQuery are required' });
        return;
    }
    try {
        const step = await appendJourneyStep(id, {
            nodeId: body.nodeId,
            slug: body.slug,
            displayQuery: body.displayQuery,
            source: body.source,
        });
        if (!step) {
            res.status(500).json({ error: 'Could not save step' });
            return;
        }
        res.status(201).json({
            id: step.id,
            order: step.order,
            slug: step.slug,
            displayQuery: step.displayQuery,
            source: step.source,
            nodeId: step.nodeId,
            timestamp: step.timestamp.toISOString(),
        });
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status =
            message === 'Journey not found'
                ? 404
                : message === 'Invalid journey step' || message.includes('step limit')
                  ? 400
                  : 500;
        res.status(status).json({ error: message });
    }
});

app.get('/topics/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const result = await resolveTopicBySlug(slug);
        if (!result) {
            res.status(404).json({ error: 'Topic not found' });
            return;
        }
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/nodes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const node = await prisma.node.findUnique({
            where: { id },
        });
        if (!node) {
            res.status(404).json({ error: 'Node not found' });
            return;
        }
        res.json(node);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/nodes/:id/comments', commentReadLimiter, async (req, res) => {
    const { id } = req.params;
    try {
        const comments = await prisma.comment.findMany({
            where: { nodeId: id },
            orderBy: { createdAt: 'asc' },
        });
        res.json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/nodes/:id/comments', commentWriteLimiter, commentSpamGuard, async (req, res) => {
    const { id } = req.params;
    const { text, authorName } = req.body as { text?: string; authorName?: string };

    if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'text is required' });
        return;
    }

    try {
        const node = await prisma.node.findUnique({ where: { id } });
        if (!node) {
            res.status(404).json({ error: 'Node not found' });
            return;
        }

        const comment = await prisma.comment.create({
            data: {
                nodeId: id,
                text: text.trim().slice(0, 2000),
                authorName: typeof authorName === 'string' && authorName.trim()
                    ? authorName.trim().slice(0, 80)
                    : 'Guest',
            },
        });
        res.status(201).json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/nodes/:id/links', commentReadLimiter, async (req, res) => {
    const { id } = req.params;
    try {
        const links = await prisma.webLink.findMany({
            where: { nodeId: id },
            orderBy: { createdAt: 'asc' },
        });
        res.json(links);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/nodes/:id/links', linkWriteLimiter, linkSpamGuard, async (req, res) => {
    const { id } = req.params;
    const { title, authorName } = req.body as { title?: string; authorName?: string };
    const url = (req as express.Request & { normalizedLinkUrl?: string }).normalizedLinkUrl;

    if (!url) {
        res.status(400).json({ error: 'Enter a valid http or https link' });
        return;
    }

    try {
        const node = await prisma.node.findUnique({ where: { id } });
        if (!node) {
            res.status(404).json({ error: 'Node not found' });
            return;
        }

        const link = await prisma.webLink.create({
            data: {
                nodeId: id,
                url,
                title: typeof title === 'string' ? title.trim().slice(0, 200) : '',
                authorName: typeof authorName === 'string' && authorName.trim()
                    ? authorName.trim().slice(0, 80)
                    : 'Guest',
            },
        });
        res.status(201).json(link);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
