import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db/client';
import {
    LATEST_SEARCH_SCAN,
    commentAuthor,
    commentText,
    normalizeSearchQuery,
    pickBestAnswer,
    queryKey,
    toAiAnswer,
    toLatestSearches,
} from './searches';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function readQuery(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    return normalizeSearchQuery(value);
}

async function loadGraph(query: string) {
    const matched = await prisma.node.findMany({
        where: {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { aiSummary: { contains: query, mode: 'insensitive' } },
            ],
        },
        take: 5,
    });

    if (matched.length === 0) {
        return { nodes: [], edges: [], best: null };
    }

    const edges = await prisma.edge.findMany({
        where: {
            OR: [
                { fromNodeId: { in: matched.map((node) => node.id) } },
                { toNodeId: { in: matched.map((node) => node.id) } },
            ],
        },
    });

    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
        connectedNodeIds.add(edge.fromNodeId);
        connectedNodeIds.add(edge.toNodeId);
    });
    matched.forEach((node) => connectedNodeIds.add(node.id));

    const nodes = await prisma.node.findMany({
        where: { id: { in: Array.from(connectedNodeIds) } },
    });

    return {
        nodes,
        edges,
        best: pickBestAnswer(nodes, query),
    };
}

async function threadFor(query: string) {
    const thread = await prisma.searchThread.upsert({
        where: { queryKey: queryKey(query) },
        create: { queryKey: queryKey(query), query },
        update: { query },
        include: {
            comments: {
                orderBy: { createdAt: 'desc' },
                take: 100,
            },
        },
    });

    const { best } = await loadGraph(query);
    return {
        query,
        answer: best ? toAiAnswer(best) : null,
        comments: thread.comments.reverse().map((comment) => ({
            id: comment.id,
            authorName: comment.authorName,
            text: comment.text,
            createdAt: comment.createdAt.toISOString(),
        })),
    };
}

app.get('/', (_req, res) => {
    res.send('Antigravity API is running');
});

app.get('/searches', async (_req, res) => {
    try {
        const recent = await prisma.search.findMany({
            orderBy: { createdAt: 'desc' },
            take: LATEST_SEARCH_SCAN,
            select: { query: true, createdAt: true },
        });

        res.json({ searches: toLatestSearches(recent) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/thread', async (req, res) => {
    const query = readQuery(req.query.q);
    if (!query) {
        res.status(400).json({ error: 'Query parameter q is required' });
        return;
    }

    try {
        res.json(await threadFor(query));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/thread/comments', async (req, res) => {
    const query = readQuery(req.body?.query);
    const text = commentText(req.body?.text);
    if (!query || !text) {
        res.status(400).json({ error: 'Query and comment text are required' });
        return;
    }

    try {
        const thread = await prisma.searchThread.upsert({
            where: { queryKey: queryKey(query) },
            create: { queryKey: queryKey(query), query },
            update: { query },
        });
        const comment = await prisma.searchComment.create({
            data: {
                threadId: thread.id,
                authorName: commentAuthor(req.body?.authorName),
                text,
            },
        });
        res.status(201).json({
            id: comment.id,
            authorName: comment.authorName,
            text: comment.text,
            createdAt: comment.createdAt.toISOString(),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/search', async (req, res) => {
    const query = readQuery(req.query.q);
    if (!query) {
        res.status(400).json({ error: 'Query parameter q is required' });
        return;
    }

    try {
        await prisma.search.create({ data: { query } });
    } catch (error) {
        console.error('Failed to record search', error);
    }

    try {
        const { nodes, edges, best } = await loadGraph(query);
        res.json({
            nodes,
            edges,
            path: best ? [best.id] : [],
        });
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
