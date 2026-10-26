import prisma from '../db/client';
import { normalizeQuery } from './normalizeQuery';
import { payloadForTopic } from './graph';
import { createTopicGraphFromGeneration } from './generateAnswer';
import { aliasTopicToQuery, persistTopic } from './persistTopic';
import { findSimilarTopic } from './similarQuery';

const MAX_QUERY_LENGTH = 500;

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

    const created = await createTopicGraphFromGeneration(trimmed);
    return persistTopic(trimmed, normalizedQuery, created.primaryNodeId, {
        generated: true,
        reviewedAt: created.reviewedAt,
        reviewRevisionUsed: created.reviewRevisionUsed,
        generationMeta: created.generationMeta,
    });
}

export async function resolveTopicBySlug(slug: string) {
    const topic = await prisma.searchTopic.findUnique({ where: { slug } });
    if (!topic) return null;
    return payloadForTopic(topic, { cached: true, generated: false });
}
