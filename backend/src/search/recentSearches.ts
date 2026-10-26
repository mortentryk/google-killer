import prisma from '../db/client';

export type RecentSearchRow = {
    id: string;
    displayQuery: string;
    slug: string;
    createdAt: Date;
    commentCount: number;
};

const MAX_QUERY_DISPLAY = 120;
const DEDUPE_FETCH_MULTIPLIER = 8;
const MAX_FETCH = 400;

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

function dedupeBySlugNewestFirst(rows: RowBase[]): RowBase[] {
    const seen = new Set<string>();
    const out: RowBase[] = [];
    for (const row of rows) {
        if (seen.has(row.slug)) continue;
        seen.add(row.slug);
        out.push(row);
    }
    return out;
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
    const fetchCap = Math.min(take * DEDUPE_FETCH_MULTIPLIER, MAX_FETCH);

    const events = await prisma.searchEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: fetchCap,
        select: { id: true, displayQuery: true, slug: true, createdAt: true },
    });

    let merged = dedupeBySlugNewestFirst(events);

    if (merged.length < take) {
        const seen = new Set(merged.map((r) => r.slug));
        const topics = await prisma.searchTopic.findMany({
            orderBy: { createdAt: 'desc' },
            take: fetchCap,
            select: { id: true, displayQuery: true, slug: true, createdAt: true },
        });
        for (const topic of topics) {
            if (seen.has(topic.slug)) continue;
            merged.push(topic);
            seen.add(topic.slug);
            if (merged.length >= take) break;
        }
    }

    return withCommentCounts(merged.slice(0, take));
}
