import prisma from '../db/client';
import { normalizeQuery, queryTokens } from './normalizeQuery';
import { payloadForTopic } from './graph';
import { createTopicFromGeneration } from './generateAnswer';
import { persistTopic, aliasTopicToQuery } from './persistTopic';
import { findSimilarTopic } from './similarQuery';

const MIN_SEED_SCORE = 20;
const MAX_QUERY_LENGTH = 500;

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
    const titleLower = title.toLowerCase();
    const titleTokenHits = tokens.filter((t) => titleLower.includes(t)).length;
    if (titleTokenHits === 0 && score < 45) {
        return 0;
    }
    return score;
}

async function pickPrimaryNodeId(normalized: string): Promise<string | null> {
    const tokens = queryTokens(normalized);
    if (!normalized) return null;

    const exactTitle = await prisma.node.findFirst({
        where: { title: { equals: normalized, mode: 'insensitive' } },
    });
    if (exactTitle) return exactTitle.id;

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

    return bestScore >= MIN_SEED_SCORE ? bestId : null;
}

export async function resolveSearch(rawQuery: string) {
    const trimmed = rawQuery.trim();
    if (!trimmed) return null;
    if (trimmed.length > MAX_QUERY_LENGTH) {
        throw new Error('Query is too long');
    }

    const normalizedQuery = normalizeQuery(trimmed);
    if (!normalizedQuery) return null;

    const existing = await prisma.searchTopic.findUnique({
        where: { normalizedQuery },
    });
    if (existing) {
        return payloadForTopic(existing, { cached: true, generated: false });
    }

    const similar = await findSimilarTopic(normalizedQuery);
    if (similar && similar.normalizedQuery !== normalizedQuery) {
        return aliasTopicToQuery(similar, normalizedQuery, trimmed);
    }
    if (similar) {
        return payloadForTopic(similar, { cached: true, generated: false });
    }

    const seedNodeId = await pickPrimaryNodeId(normalizedQuery);
    if (seedNodeId) {
        return persistTopic(trimmed, normalizedQuery, seedNodeId, { generated: false });
    }

    const primaryNodeId = await createTopicFromGeneration(trimmed);
    return persistTopic(trimmed, normalizedQuery, primaryNodeId, { generated: true });
}

export async function resolveTopicBySlug(slug: string) {
    const topic = await prisma.searchTopic.findUnique({ where: { slug } });
    if (!topic) return null;
    return payloadForTopic(topic, { cached: true, generated: false });
}
