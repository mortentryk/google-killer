import prisma from '../db/client';

const SIMILARITY_THRESHOLD = 0.4;

export async function findSimilarTopic(normalizedQuery: string) {
    if (!normalizedQuery) return null;

    try {
        const rows = await prisma.$queryRaw<
            Array<{
                id: string;
                slug: string;
                normalizedQuery: string;
                displayQuery: string;
                primaryNodeId: string;
            }>
        >`
            SELECT id, slug, "normalizedQuery", "displayQuery", "primaryNodeId"
            FROM "SearchTopic"
            WHERE similarity("normalizedQuery", ${normalizedQuery}) > ${SIMILARITY_THRESHOLD}
            ORDER BY similarity("normalizedQuery", ${normalizedQuery}) DESC
            LIMIT 1
        `;
        return rows[0] ?? null;
    } catch (error) {
        console.warn('Similarity search unavailable (pg_trgm missing?)', error);
        return null;
    }
}
