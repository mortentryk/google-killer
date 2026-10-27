import express from 'express';
import cors from 'cors';
import prisma from './db/client';
import { resolveSearch } from './resolveSearch';

export function createApp() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const api = express.Router();

    api.get('/', (_req, res) => {
        res.send('Antigravity API is running');
    });

    api.get('/search', async (req, res) => {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            res.status(400).json({ error: 'Query parameter q is required' });
            return;
        }

        try {
            const result = await resolveSearch(q);
            res.json({
                nodes: result.nodes,
                edges: result.edges,
                path: result.path,
                meta: { matched: result.matched, rabbitHoleId: result.rabbitHoleId },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    api.get('/nodes/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const node = await prisma.node.findUnique({ where: { id } });
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

    app.use('/api', api);

    return app;
}
