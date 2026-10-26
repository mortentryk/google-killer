import { Edge, GraphData, Node } from '../types';

const HUB_TITLES = new Set(['home']);

export function isHubNode(node: Node): boolean {
    return HUB_TITLES.has(node.title.trim().toLowerCase());
}

function childEdges(edges: Edge[]): Edge[] {
    return edges.filter((e) => String(e.relationType) === 'CHILD');
}

function parentByChild(edges: Edge[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const e of childEdges(edges)) {
        map.set(e.toNodeId, e.fromNodeId);
    }
    return map;
}

function childrenOf(nodeId: string, edges: Edge[]): string[] {
    return childEdges(edges)
        .filter((e) => e.fromNodeId === nodeId)
        .map((e) => e.toNodeId);
}

/** Broad → narrow: Plumbing → Radiator → answer (Home excluded). */
export function buildApproachChain(data: GraphData): Node[] {
    const primaryId = data.primaryNodeId;
    if (!primaryId) return [];

    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    const parent = parentByChild(data.edges);

    const ids: string[] = [];
    let cur: string | undefined = primaryId;
    while (cur) {
        ids.unshift(cur);
        cur = parent.get(cur);
    }

    return ids.map((id) => byId.get(id)).filter((n): n is Node => !!n && !isHubNode(n));
}

export function getNextBranchChoices(currentNodeId: string, data: GraphData, visitedIds: Set<string>): Node[] {
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    const parent = parentByChild(data.edges);
    const choices: Node[] = [];
    const seen = new Set<string>();

    for (const childId of childrenOf(currentNodeId, data.edges)) {
        if (visitedIds.has(childId) || seen.has(childId)) continue;
        const node = byId.get(childId);
        if (node && !isHubNode(node)) {
            choices.push(node);
            seen.add(childId);
        }
    }

    const parentId = parent.get(currentNodeId);
    if (parentId) {
        for (const siblingId of childrenOf(parentId, data.edges)) {
            if (siblingId === currentNodeId || visitedIds.has(siblingId) || seen.has(siblingId)) continue;
            const node = byId.get(siblingId);
            if (node && !isHubNode(node)) {
                choices.push(node);
                seen.add(siblingId);
            }
        }
    }

    return choices;
}
