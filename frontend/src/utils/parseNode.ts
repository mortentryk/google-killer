import { Node } from '../types';

export function parseNode(raw: Record<string, unknown>): Node {
    const asStrings = (v: unknown) =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

    return {
        id: String(raw.id),
        title: String(raw.title),
        category: raw.category as Node['category'],
        aiSummary: String(raw.aiSummary ?? ''),
        steps: asStrings(raw.steps),
        difficulty: Number(raw.difficulty ?? 1),
        timeEstimate: String(raw.timeEstimate ?? ''),
        costEstimate: String(raw.costEstimate ?? ''),
        tools: asStrings(raw.tools),
        materials: asStrings(raw.materials),
        commonMistakes: asStrings(raw.commonMistakes),
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
    };
}

export function parseGraphPayload(raw: Record<string, unknown>) {
    const nodes = Array.isArray(raw.nodes)
        ? raw.nodes.map((n) => parseNode(n as Record<string, unknown>))
        : [];

    return {
        nodes,
        edges: Array.isArray(raw.edges) ? raw.edges : [],
        path: Array.isArray(raw.path) ? (raw.path as string[]) : [],
        slug: typeof raw.slug === 'string' ? raw.slug : '',
        displayQuery: typeof raw.displayQuery === 'string' ? raw.displayQuery : '',
        primaryNodeId: typeof raw.primaryNodeId === 'string' ? raw.primaryNodeId : '',
        cached: Boolean(raw.cached),
        generated: Boolean(raw.generated),
        normalizedQuery: typeof raw.normalizedQuery === 'string' ? raw.normalizedQuery : '',
        aiReviewed: Boolean(raw.aiReviewed),
        reviewRevisionUsed: Boolean(raw.reviewRevisionUsed),
    };
}
