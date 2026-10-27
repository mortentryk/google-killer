import { Prisma } from '@prisma/client';
import prisma from '../db/client';
import { payloadForTopic } from './graph';
import { intentSignature } from './intent';
import { slugify, slugWithSuffix } from './slug';
import { GenerationMeta } from './topicGraphTypes';

function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );
}

function uniqueTarget(error: Prisma.PrismaClientKnownRequestError): string {
    const target = error.meta?.target;
    if (Array.isArray(target)) return target.map(String).join(' ');
    return typeof target === 'string' ? target : '';
}

async function createTopicRecord(
    tx: Prisma.TransactionClient,
    data: {
        normalizedQuery: string;
        displayQuery: string;
        intentSignature: string | null;
        primaryNodeId: string;
        reviewedAt?: Date;
        reviewRevisionUsed?: boolean;
        generationMeta?: GenerationMeta;
    }
) {
    const baseSlug = slugify(data.normalizedQuery);
    for (let suffix = 0; suffix < 20; suffix += 1) {
        const slug = slugWithSuffix(baseSlug, suffix);
        try {
            return await tx.searchTopic.create({
                data: {
                    slug,
                    normalizedQuery: data.normalizedQuery,
                    intentSignature: data.intentSignature,
                    displayQuery: data.displayQuery,
                    primaryNodeId: data.primaryNodeId,
                    reviewedAt: data.reviewedAt ?? null,
                    reviewRevisionUsed: data.reviewRevisionUsed ?? false,
                    generationMeta: data.generationMeta
                        ? (data.generationMeta as Prisma.InputJsonValue)
                        : undefined,
                },
            });
        } catch (error) {
            if (!isUniqueViolation(error)) throw error;
            const target = uniqueTarget(error);
            if (target.includes('normalizedQuery')) {
                return tx.searchTopic.findUniqueOrThrow({
                    where: { normalizedQuery: data.normalizedQuery },
                });
            }
            if (target.includes('intentSignature') && data.intentSignature) {
                return tx.searchTopic.findUniqueOrThrow({
                    where: { intentSignature: data.intentSignature },
                });
            }
        }
    }
    throw new Error('Could not allocate a unique slug');
}

export type PersistTopicFlags = {
    generated: boolean;
    reviewedAt?: Date;
    reviewRevisionUsed?: boolean;
    generationMeta?: GenerationMeta;
};

export async function persistTopic(
    displayQuery: string,
    normalizedQuery: string,
    primaryNodeId: string,
    flags: PersistTopicFlags
) {
    const signature = intentSignature(displayQuery);

    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedQuery}))`;
        if (signature) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`intent:${signature}`}))`;
            const byIntent = await tx.searchTopic.findUnique({
                where: { intentSignature: signature },
            });
            if (byIntent) {
                return payloadForTopic(byIntent, { cached: true, generated: false });
            }
        }

        const existing = await tx.searchTopic.findUnique({
            where: { normalizedQuery },
        });
        if (existing) {
            return payloadForTopic(existing, { cached: true, generated: false });
        }

        const topic = await createTopicRecord(tx, {
            normalizedQuery,
            displayQuery: displayQuery.trim(),
            intentSignature: signature,
            primaryNodeId,
            reviewedAt: flags.reviewedAt,
            reviewRevisionUsed: flags.reviewRevisionUsed,
            generationMeta: flags.generationMeta,
        });

        return payloadForTopic(topic, {
            cached: false,
            generated: flags.generated,
        });
    });
}

export async function aliasTopicToQuery(
    similarTopic: {
        slug: string;
        normalizedQuery: string;
        displayQuery: string;
        primaryNodeId: string;
    },
    newNormalizedQuery: string,
    newDisplayQuery: string
) {
    const payload = await persistTopic(newDisplayQuery, newNormalizedQuery, similarTopic.primaryNodeId, {
        generated: false,
    });
    return { ...payload, cached: true };
}
