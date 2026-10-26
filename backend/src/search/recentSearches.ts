import prisma from '../db/client';

export type RecentSearchRow = {
    id: string;
    displayQuery: string;
    slug: string;
    createdAt: Date;
};

const MAX_QUERY_DISPLAY = 120;

export async function recordSearchEvent(displayQuery: string, slug: string): Promise<void> {
    const trimmed = displayQuery.trim().slice(0, MAX_QUERY_DISPLAY);
    if (!trimmed || !slug) return;

    await prisma.searchEvent.create({
        data: { displayQuery: trimmed, slug },
    });
}

export async function listRecentSearches(limit: number): Promise<RecentSearchRow[]> {
    const take = Math.min(Math.max(limit, 1), 50);

    const events = await prisma.searchEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, displayQuery: true, slug: true, createdAt: true },
    });

    if (events.length >= take) {
        return events;
    }

    const topics = await prisma.searchTopic.findMany({
        orderBy: { createdAt: 'desc' },
        take: take - events.length,
        select: { id: true, displayQuery: true, slug: true, createdAt: true },
    });

    return [...events, ...topics];
}
