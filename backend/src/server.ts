import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db/client';
import { resolveSearch, resolveTopicBySlug } from './search/resolveSearch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Antigravity API is running');
});

app.get('/search', async (req, res) => {
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
        res.status(500).json({ error: 'Internal server error' });
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

app.get('/nodes/:id/comments', async (req, res) => {
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

app.post('/nodes/:id/comments', async (req, res) => {
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
                text: text.trim(),
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
