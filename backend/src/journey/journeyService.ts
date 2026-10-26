import prisma from '../db/client';
import { isHubTrailStep } from './trailRules';

const MAX_STEPS = 40;

export type JourneyStepInput = {
    nodeId: string;
    slug: string;
    displayQuery: string;
    source?: string;
};

export async function createJourney() {
    return prisma.journey.create({
        data: {},
        select: { id: true, startedAt: true },
    });
}

export async function appendJourneyStep(journeyId: string, input: JourneyStepInput) {
    const slug = input.slug.trim();
    const displayQuery = input.displayQuery.trim().slice(0, 200);
    const source = (input.source || 'search').slice(0, 32);

    if (!slug || !displayQuery || !input.nodeId) {
        throw new Error('Invalid journey step');
    }

    const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
        select: { id: true },
    });
    if (!journey) {
        throw new Error('Journey not found');
    }

    if (isHubTrailStep(slug, displayQuery)) {
        return prisma.journeyStep.findFirst({
            where: { journeyId },
            orderBy: { order: 'desc' },
        });
    }

    const count = await prisma.journeyStep.count({ where: { journeyId } });
    if (count >= MAX_STEPS) {
        throw new Error('This rabbit hole is full (step limit reached)');
    }

    const last = await prisma.journeyStep.findFirst({
        where: { journeyId },
        orderBy: { order: 'desc' },
        select: { slug: true, order: true },
    });
    if (last?.slug === slug) {
        return prisma.journeyStep.findFirst({
            where: { journeyId },
            orderBy: { order: 'desc' },
        });
    }

    const alreadyVisited = await prisma.journeyStep.findFirst({
        where: { journeyId, slug },
        orderBy: { order: 'asc' },
    });
    if (alreadyVisited) {
        return alreadyVisited;
    }

    return prisma.journeyStep.create({
        data: {
            journeyId,
            nodeId: input.nodeId,
            slug,
            displayQuery,
            source,
            order: (last?.order ?? -1) + 1,
        },
    });
}

export type RecentHoleSummary = {
    id: string;
    startedAt: Date;
    updatedAt: Date;
    stepCount: number;
    firstQuery: string;
    lastQuery: string;
    firstSlug: string;
    lastSlug: string;
};

export async function listRecentHoles(limit: number): Promise<RecentHoleSummary[]> {
    const take = Math.min(Math.max(limit, 1), 50);

    const journeys = await prisma.journey.findMany({
        orderBy: { startedAt: 'desc' },
        take: 150,
        include: {
            steps: { orderBy: { order: 'asc' } },
        },
    });

    return journeys
        .map((j) => {
            const cleaned = j.steps.filter(
                (s) => !isHubTrailStep(s.slug, s.displayQuery)
            );
            return { journey: j, cleaned };
        })
        .filter(({ cleaned }) => cleaned.length >= 2)
        .map(({ journey: j, cleaned }) => {
            const first = cleaned[0];
            const last = cleaned[cleaned.length - 1];
            return {
                id: j.id,
                startedAt: j.startedAt,
                updatedAt: last.timestamp,
                stepCount: cleaned.length,
                firstQuery: first.displayQuery,
                lastQuery: last.displayQuery,
                firstSlug: first.slug,
                lastSlug: last.slug,
            };
        })
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, take);
}

export async function getJourneyPublic(journeyId: string) {
    const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
        include: {
            steps: {
                orderBy: { order: 'asc' },
                include: {
                    node: { select: { title: true, aiSummary: true } },
                },
            },
        },
    });
    return journey;
}
