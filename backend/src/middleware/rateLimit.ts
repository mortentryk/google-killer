import { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export function clientKey(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
}

export function rateLimit(options: {
    windowMs: number;
    max: number;
    prefix: string;
}) {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = `${options.prefix}:${clientKey(req)}`;
        const now = Date.now();
        let bucket = store.get(key);

        if (!bucket || now > bucket.resetAt) {
            bucket = { count: 0, resetAt: now + options.windowMs };
            store.set(key, bucket);
        }

        bucket.count += 1;

        if (bucket.count > options.max) {
            res.status(429).json({
                error: 'Too many requests. Please wait a moment and try again.',
            });
            return;
        }

        next();
    };
}
