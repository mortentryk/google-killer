import { Prisma } from '@prisma/client';
import prisma from '../db/client';
import { payloadForTopic } from './graph';
import { slugify, slugWithSuffix } from './slug';

function isUniqueViolation(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );
}

async function createTopicRecord(
    tx: Prisma.TransactionClient,
    data: {
        normalizedQuery: string;
        displayQuery: string;
        primaryNodeId: string;
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
                    displayQuery: data.displayQuery,
                    primaryNodeId: data.primaryNodeId,
                },
            });
        } catch (error) {
            if (!isUniqueViolation(error)) throw error;
            const target = (error as Prisma.PrismaClientKnownRequestError).meta?.target;
            if (Array.isArray(target) && target.includes('normalizedQuery')) {
                return tx.searchTopic.findUniqueOrThrow({
                    where: { normalizedQuery: data.normalizedQuery },
                });
            }
        }
    }
    throw new Error('Could not allocate a unique slug');
}

export async function persistTopic(
    displayQuery: string,
    normalizedQuery: string,
    primaryNodeId: string,
    flags: { generated: boolean }
) {
    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedQuery}))`;

        const existing = await tx.searchTopic.findUnique({
            where: { normalizedQuery },
        });
        if (existing) {
            return payloadForTopic(existing, { cached: true, generated: false });
        }

        const topic = await createTopicRecord(tx, {
            normalizedQuery,
            displayQuery: displayQuery.trim(),
            primaryNodeId,
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
