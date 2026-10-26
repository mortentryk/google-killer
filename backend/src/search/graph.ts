import { Edge, Node } from '@prisma/client';
import prisma from '../db/client';

export type GraphPayload = {
    nodes: Node[];
    edges: Edge[];
    path: string[];
    slug: string;
    displayQuery: string;
    primaryNodeId: string;
    cached: boolean;
    generated: boolean;
    normalizedQuery: string;
};

export async function connectedSubgraph(primaryNodeId: string): Promise<{
    nodes: Node[];
    edges: Edge[];
    path: string[];
}> {
    const allEdges = await prisma.edge.findMany();
    const nodeIds = new Set<string>([primaryNodeId]);

    let changed = true;
    while (changed) {
        changed = false;
        for (const edge of allEdges) {
            if (nodeIds.has(edge.fromNodeId) && !nodeIds.has(edge.toNodeId)) {
                nodeIds.add(edge.toNodeId);
                changed = true;
            }
            if (nodeIds.has(edge.toNodeId) && !nodeIds.has(edge.fromNodeId)) {
                nodeIds.add(edge.fromNodeId);
                changed = true;
            }
        }
    }

    const edges = allEdges.filter(
        (e) => nodeIds.has(e.fromNodeId) && nodeIds.has(e.toNodeId)
    );
    const nodes = await prisma.node.findMany({
        where: { id: { in: Array.from(nodeIds) } },
    });

    return {
        nodes,
        edges,
        path: [primaryNodeId],
    };
}

export async function payloadForTopic(
    topic: {
        slug: string;
        displayQuery: string;
        normalizedQuery: string;
        primaryNodeId: string;
    },
    flags: { cached: boolean; generated: boolean }
): Promise<GraphPayload> {
    const graph = await connectedSubgraph(topic.primaryNodeId);
    return {
        ...graph,
        slug: topic.slug,
        displayQuery: topic.displayQuery,
        primaryNodeId: topic.primaryNodeId,
        normalizedQuery: topic.normalizedQuery,
        cached: flags.cached,
        generated: flags.generated,
    };
}
