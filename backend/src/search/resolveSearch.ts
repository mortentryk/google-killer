import prisma from '../db/client';
import { normalizeQuery, queryTokens } from './normalizeQuery';
import { connectedSubgraph, GraphPayload } from './graph';

function scoreNode(
    title: string,
    aiSummary: string,
    tokens: string[],
    normalized: string
): number {
    const haystack = `${title} ${aiSummary}`.toLowerCase();
    let score = 0;
    if (title.toLowerCase() === normalized) score += 100;
    if (title.toLowerCase().includes(normalized)) score += 40;
    for (const token of tokens) {
        if (haystack.includes(token)) score += 10;
    }
    if (title.toLowerCase().includes(normalized) || normalized.includes(title.toLowerCase())) {
        score += 5;
    }
    return score;
}

async function pickPrimaryNodeId(normalized: string): Promise<string | null> {
    const tokens = queryTokens(normalized);
    if (!normalized) return null;

    const candidates = await prisma.node.findMany();
    let bestId: string | null = null;
    let bestScore = 0;

    for (const node of candidates) {
        const score = scoreNode(node.title, node.aiSummary, tokens, normalized);
        if (score > bestScore) {
            bestScore = score;
            bestId = node.id;
        }
    }

    return bestScore > 0 ? bestId : null;
}

export async function resolveSearch(rawQuery: string): Promise<GraphPayload | null> {
    const normalizedQuery = normalizeQuery(rawQuery);
    if (!normalizedQuery) return null;

    const existing = await prisma.searchTopic.findUnique({
        where: { normalizedQuery },
    });

    if (existing) {
        const graph = await connectedSubgraph(existing.primaryNodeId);
        return {
            ...graph,
            cached: true,
            normalizedQuery,
        };
    }

    const primaryNodeId = await pickPrimaryNodeId(normalizedQuery);
    if (!primaryNodeId) return null;

    await prisma.searchTopic.create({
        data: {
            normalizedQuery,
            primaryNodeId,
        },
    });

    const graph = await connectedSubgraph(primaryNodeId);
    return {
        ...graph,
        cached: false,
        normalizedQuery,
    };
}
