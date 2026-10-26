export const LATEST_SEARCH_LIMIT = 12;
export const LATEST_SEARCH_SCAN = 100;
export const MAX_QUERY_LENGTH = 200;
export const MAX_COMMENT_LENGTH = 1000;
export const MAX_AUTHOR_LENGTH = 40;

export function normalizeSearchQuery(raw: string): string | null {
    const query = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH);
    return query.length > 0 ? query : null;
}

export interface SearchRow {
    query: string;
    createdAt: Date;
}

export interface LatestSearch {
    query: string;
    searchedAt: string;
}

export function toLatestSearches(
    rows: SearchRow[],
    limit = LATEST_SEARCH_LIMIT
): LatestSearch[] {
    const seen = new Set<string>();
    const searches: LatestSearch[] = [];

    for (const row of rows) {
        const key = row.query.toLocaleLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        searches.push({
            query: row.query,
            searchedAt: row.createdAt.toISOString(),
        });
        if (searches.length === limit) break;
    }

    return searches;
}

export function queryKey(query: string): string {
    return query.toLocaleLowerCase();
}

export function textList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

export interface AnswerNode {
    id: string;
    title: string;
    aiSummary: string;
    steps: unknown;
}

export function scoreAnswer(node: AnswerNode, query: string): number {
    const q = query.toLocaleLowerCase();
    const title = node.title.toLocaleLowerCase();
    const summary = node.aiSummary.toLocaleLowerCase();
    let score = 0;

    if (title === q) score += 50;
    else if (title.includes(q)) score += 40;
    else if (summary.includes(q)) score += 25;
    else if (q.includes(title) && title.length > 2) score += 15;
    else return 0;

    const steps = textList(node.steps);
    if (steps.length > 0) score += 30 + Math.min(steps.length, 5);
    if (node.aiSummary.trim().length > 80) score += 10;
    return score;
}

export function pickBestAnswer<T extends AnswerNode>(nodes: T[], query: string): T | null {
    let best: T | null = null;
    let bestScore = 0;

    for (const node of nodes) {
        const score = scoreAnswer(node, query);
        if (score > bestScore) {
            best = node;
            bestScore = score;
        }
    }

    return best;
}

export function commentAuthor(raw: unknown): string {
    if (typeof raw !== 'string') return 'Someone';
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_AUTHOR_LENGTH);
    return name || 'Someone';
}

export function commentText(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const text = raw.trim().slice(0, MAX_COMMENT_LENGTH);
    return text || null;
}

export interface AiAnswer {
    title: string;
    summary: string;
    steps: string[];
    difficulty: number;
    timeEstimate: string;
    costEstimate: string;
    tools: string[];
    materials: string[];
}

export function toAiAnswer(node: AnswerNode & {
    difficulty?: number;
    timeEstimate?: string;
    costEstimate?: string;
    tools?: unknown;
    materials?: unknown;
}): AiAnswer {
    return {
        title: node.title,
        summary: node.aiSummary,
        steps: textList(node.steps),
        difficulty: typeof node.difficulty === 'number' ? node.difficulty : 1,
        timeEstimate: node.timeEstimate ?? '',
        costEstimate: node.costEstimate ?? '',
        tools: textList(node.tools),
        materials: textList(node.materials),
    };
}
