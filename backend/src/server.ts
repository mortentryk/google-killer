import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db/client';
import {
    LATEST_SEARCH_SCAN,
    normalizeSearchQuery,
    toLatestSearches,
} from './searches';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
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

app.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        res.status(400).json({ error: 'Query parameter q is required' });
        return;
    }

    const query = normalizeSearchQuery(q);
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
        const nodes = await prisma.node.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { aiSummary: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5
        });

        const edges = await prisma.edge.findMany({
            where: {
                OR: [
                    { fromNodeId: { in: nodes.map(n => n.id) } },
                    { toNodeId: { in: nodes.map(n => n.id) } }
                ]
            }
        });

        const connectedNodeIds = new Set<string>();
        edges.forEach(e => {
            connectedNodeIds.add(e.fromNodeId);
            connectedNodeIds.add(e.toNodeId);
        });
        nodes.forEach(n => connectedNodeIds.add(n.id));

        const allNodes = await prisma.node.findMany({
            where: { id: { in: Array.from(connectedNodeIds) } }
        });

        res.json({
            nodes: allNodes,
            edges: edges,
            path: nodes.length > 0 ? [nodes[0].id] : []
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
            where: { id }
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
