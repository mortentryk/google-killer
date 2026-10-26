import { Edge, Node, RelationType } from '@prisma/client';
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

/** Mind map for one topic: primary node, its CHILD-chain ancestors, and CHILD-chain descendants only (no sibling branches). */
export async function connectedSubgraph(primaryNodeId: string): Promise<{
    nodes: Node[];
    edges: Edge[];
    path: string[];
}> {
    const allEdges = await prisma.edge.findMany();
    const childEdges = allEdges.filter((e) => e.relationType === RelationType.CHILD);

    const nodeIds = new Set<string>([primaryNodeId]);

    const addAncestors = (nodeId: string) => {
        for (const edge of childEdges) {
            if (edge.toNodeId === nodeId && !nodeIds.has(edge.fromNodeId)) {
                nodeIds.add(edge.fromNodeId);
                addAncestors(edge.fromNodeId);
            }
        }
    };

    const addDescendants = (nodeId: string) => {
        for (const edge of childEdges) {
            if (edge.fromNodeId === nodeId && !nodeIds.has(edge.toNodeId)) {
                nodeIds.add(edge.toNodeId);
                addDescendants(edge.toNodeId);
            }
        }
    };

    addAncestors(primaryNodeId);
    addDescendants(primaryNodeId);

    const edges = childEdges.filter(
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
