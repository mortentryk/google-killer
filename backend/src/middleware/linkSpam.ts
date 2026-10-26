import { Request, Response, NextFunction } from 'express';
import prisma from '../db/client';
import { clientKey } from './rateLimit';
import { normalizeHttpUrl } from '../utils/normalizeUrl';

const recentByIp = new Map<string, number>();
const MIN_MS_BETWEEN = 20_000;

export async function linkSpamGuard(req: Request, res: Response, next: NextFunction) {
    const body = req.body as { url?: string; website?: string };
    const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
    if (honeypot) {
        res.status(400).json({ error: 'Could not add link' });
        return;
    }

    const url = typeof body.url === 'string' ? normalizeHttpUrl(body.url) : null;
    if (!url) {
        res.status(400).json({ error: 'Enter a valid http or https link' });
        return;
    }

    const ip = clientKey(req);
    const now = Date.now();
    const last = recentByIp.get(ip) ?? 0;
    if (now - last < MIN_MS_BETWEEN) {
        res.status(429).json({ error: 'Please wait before adding another link.' });
        return;
    }

    const nodeId = req.params.id;
    const duplicate = await prisma.webLink.findFirst({
        where: { nodeId, url },
    });
    if (duplicate) {
        res.status(409).json({ error: 'This link is already listed for this answer.' });
        return;
    }

    (req as Request & { normalizedLinkUrl?: string }).normalizedLinkUrl = url;
    recentByIp.set(ip, now);
    next();
}
