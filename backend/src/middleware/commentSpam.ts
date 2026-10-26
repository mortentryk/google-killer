import { Request, Response, NextFunction } from 'express';
import prisma from '../db/client';
import { clientKey } from './rateLimit';

const recentByIp = new Map<string, number>();

const MIN_MS_BETWEEN_COMMENTS = 15_000;
const DUPLICATE_WINDOW_MS = 5 * 60_000;

export async function commentSpamGuard(req: Request, res: Response, next: NextFunction) {
    const body = req.body as { text?: string; website?: string };
    const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
    if (honeypot) {
        res.status(400).json({ error: 'Could not post comment' });
        return;
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (text.length < 2) {
        res.status(400).json({ error: 'Comment is too short' });
        return;
    }

    const ip = clientKey(req);
    const now = Date.now();
    const last = recentByIp.get(ip) ?? 0;
    if (now - last < MIN_MS_BETWEEN_COMMENTS) {
        res.status(429).json({ error: 'Please wait before posting another comment.' });
        return;
    }

    const nodeId = req.params.id;
    const since = new Date(now - DUPLICATE_WINDOW_MS);
    const duplicate = await prisma.comment.findFirst({
        where: {
            nodeId,
            text,
            createdAt: { gte: since },
        },
    });
    if (duplicate) {
        res.status(409).json({ error: 'This comment was already posted recently.' });
        return;
    }

    recentByIp.set(ip, now);
    next();
}
