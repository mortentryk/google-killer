import { Category, RelationType } from '@prisma/client';
import prisma from '../db/client';
import { clampTopicGraph, LIMITS } from './parseTopicGraph';
import { GeneratedTopicGraph, PrimaryNodePayload } from './topicGraphTypes';

type StubPayload = {
    title: string;
    aiSummary: string;
    category?: Category;
};

async function findNodeByTitle(title: string) {
    return prisma.node.findFirst({
        where: { title: { equals: title.trim(), mode: 'insensitive' } },
    });
}

async function upsertChildEdge(fromNodeId: string, toNodeId: string) {
    if (fromNodeId === toNodeId) return;
    await prisma.edge.upsert({
        where: {
            fromNodeId_toNodeId_relationType: {
                fromNodeId,
                toNodeId,
                relationType: RelationType.CHILD,
            },
        },
        create: {
            fromNodeId,
            toNodeId,
            relationType: RelationType.CHILD,
        },
        update: {},
    });
}

async function findOrCreateStub(spec: StubPayload): Promise<string> {
    const existing = await findNodeByTitle(spec.title);
    if (existing) return existing.id;

    const created = await prisma.node.create({
        data: {
            title: spec.title.slice(0, LIMITS.title),
            category: spec.category ?? Category.GENERAL,
            aiSummary: spec.aiSummary.slice(0, LIMITS.aiSummary),
            steps: [],
            difficulty: 1,
            timeEstimate: '',
            costEstimate: '',
            tools: [],
            materials: [],
            commonMistakes: [],
        },
    });
    return created.id;
}

async function findOrCreatePrimary(primary: PrimaryNodePayload): Promise<string> {
    const existing = await findNodeByTitle(primary.title);
    if (existing) {
        await prisma.node.update({
            where: { id: existing.id },
            data: {
                category: primary.category,
                aiSummary: primary.aiSummary,
                steps: primary.steps,
                difficulty: primary.difficulty,
                timeEstimate: primary.timeEstimate,
                costEstimate: primary.costEstimate,
                tools: primary.tools,
                materials: primary.materials,
                commonMistakes: primary.commonMistakes,
            },
        });
        return existing.id;
    }

    const created = await prisma.node.create({
        data: {
            title: primary.title.slice(0, LIMITS.title),
            category: primary.category,
            aiSummary: primary.aiSummary,
            steps: primary.steps,
            difficulty: primary.difficulty,
            timeEstimate: primary.timeEstimate,
            costEstimate: primary.costEstimate,
            tools: primary.tools,
            materials: primary.materials,
            commonMistakes: primary.commonMistakes,
        },
    });
    return created.id;
}

export async function persistTopicGraphToDb(graphInput: GeneratedTopicGraph): Promise<string> {
    const graph = clampTopicGraph(graphInput);
    const titleToId = new Map<string, string>();

    const register = (title: string, id: string) => {
        titleToId.set(title.toLowerCase(), id);
    };

    const resolveId = (title: string) => titleToId.get(title.toLowerCase());

    for (const pathTitle of graph.pathTitles) {
        const isPrimary =
            pathTitle.toLowerCase() === graph.primary.title.toLowerCase();
        if (isPrimary) continue;
        const id = await findOrCreateStub({
            title: pathTitle,
            aiSummary: `Context topic: ${pathTitle}.`,
            category: graph.primary.category,
        });
        register(pathTitle, id);
    }

    const primaryId = await findOrCreatePrimary(graph.primary);
    register(graph.primary.title, primaryId);

    for (const branch of graph.branches) {
        const id = await findOrCreateStub({
            title: branch.title,
            aiSummary: branch.aiSummary,
            category: graph.primary.category,
        });
        register(branch.title, id);
    }

    for (let i = 1; i < graph.pathTitles.length; i += 1) {
        const from = graph.pathTitles[i - 1];
        const to = graph.pathTitles[i];
        const fromId = resolveId(from);
        const toId = resolveId(to);
        if (fromId && toId) await upsertChildEdge(fromId, toId);
    }

    for (const branch of graph.branches) {
        const parentId = resolveId(branch.parentTitle);
        const childId = resolveId(branch.title);
        if (parentId && childId) await upsertChildEdge(parentId, childId);
    }

    return primaryId;
}
