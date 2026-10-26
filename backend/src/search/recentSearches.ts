import prisma from '../db/client';

export type RecentSearchRow = {
    id: string;
    displayQuery: string;
    slug: string;
    createdAt: Date;
    commentCount: number;
};

const MAX_QUERY_DISPLAY = 120;

type RowBase = {
    id: string;
    displayQuery: string;
    slug: string;
    createdAt: Date;
};

export async function recordSearchEvent(displayQuery: string, slug: string): Promise<void> {
    const trimmed = displayQuery.trim().slice(0, MAX_QUERY_DISPLAY);
    if (!trimmed || !slug) return;

    await prisma.searchEvent.create({
        data: { displayQuery: trimmed, slug },
    });
}

async function withCommentCounts(rows: RowBase[]): Promise<RecentSearchRow[]> {
    if (rows.length === 0) return [];

    const slugs = [...new Set(rows.map((r) => r.slug))];
    const topics = await prisma.searchTopic.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true, primaryNodeId: true },
    });
    const nodeBySlug = new Map(topics.map((t) => [t.slug, t.primaryNodeId]));
    const nodeIds = [...new Set(topics.map((t) => t.primaryNodeId))];

    const countRows =
        nodeIds.length > 0
            ? await prisma.comment.groupBy({
                  by: ['nodeId'],
                  where: { nodeId: { in: nodeIds } },
                  _count: { _all: true },
              })
            : [];
    const countByNode = new Map(countRows.map((c) => [c.nodeId, c._count._all]));

    return rows.map((row) => {
        const nodeId = nodeBySlug.get(row.slug);
        return {
            ...row,
            commentCount: nodeId ? countByNode.get(nodeId) ?? 0 : 0,
        };
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
        return withCommentCounts(events);
    }

    const topics = await prisma.searchTopic.findMany({
        orderBy: { createdAt: 'desc' },
        take: take - events.length,
        select: { id: true, displayQuery: true, slug: true, createdAt: true },
    });

    return withCommentCounts([...events, ...topics]);
}
