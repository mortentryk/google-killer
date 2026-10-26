import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db/client';
import { resolveSearch, resolveTopicBySlug } from './search/resolveSearch';
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
const commentReadLimiter = rateLimit({ prefix: 'comments-read', windowMs: 60_000, max: 120 });
const commentWriteLimiter = rateLimit({ prefix: 'comments-write', windowMs: 15 * 60_000, max: 20 });
const linkWriteLimiter = rateLimit({ prefix: 'links-write', windowMs: 15 * 60_000, max: 15 });

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
        res.json(result);
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'Query is too long' ? 400 : 500;
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
