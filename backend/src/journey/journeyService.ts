import prisma from '../db/client';

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
