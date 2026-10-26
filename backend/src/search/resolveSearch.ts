import prisma from '../db/client';
import { normalizeQuery, queryTokens } from './normalizeQuery';
import { payloadForTopic } from './graph';
import { allocateSlug } from './slug';
import { createTopicFromGeneration } from './generateAnswer';

const MIN_SEED_SCORE = 20;

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

async function cacheSeedTopic(
    rawQuery: string,
    normalizedQuery: string,
    primaryNodeId: string
) {
    const slug = await allocateSlug(normalizedQuery);
    await prisma.searchTopic.create({
        data: {
            slug,
            normalizedQuery,
            displayQuery: rawQuery.trim(),
            primaryNodeId,
        },
    });
    return slug;
}

export async function resolveSearch(rawQuery: string) {
    const normalizedQuery = normalizeQuery(rawQuery);
    if (!normalizedQuery) return null;

    const existing = await prisma.searchTopic.findUnique({
        where: { normalizedQuery },
    });

    if (existing) {
        return payloadForTopic(existing, { cached: true, generated: false });
    }

    const seedNodeId = await pickPrimaryNodeId(normalizedQuery);
    if (seedNodeId) {
        await cacheSeedTopic(rawQuery, normalizedQuery, seedNodeId);
        const topic = await prisma.searchTopic.findUniqueOrThrow({
            where: { normalizedQuery },
        });
        return payloadForTopic(topic, { cached: false, generated: false });
    }

    const slug = await allocateSlug(normalizedQuery);
    const primaryNodeId = await createTopicFromGeneration(rawQuery, normalizedQuery, slug);
    const topic = await prisma.searchTopic.findUniqueOrThrow({
        where: { normalizedQuery },
    });
    return payloadForTopic(topic, { cached: false, generated: true });
}

export async function resolveTopicBySlug(slug: string) {
    const topic = await prisma.searchTopic.findUnique({ where: { slug } });
    if (!topic) return null;
    return payloadForTopic(topic, { cached: true, generated: false });
}
