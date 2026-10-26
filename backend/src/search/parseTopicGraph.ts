import { Category } from '@prisma/client';
import {
    BranchNodeSpec,
    GeneratedTopicGraph,
    PrimaryNodePayload,
    ReviewResult,
    SuggestedSource,
} from './topicGraphTypes';

export const LIMITS = {
    title: 200,
    aiSummary: 4000,
    step: 500,
    listItem: 200,
    pathNodes: 8,
    branches: 4,
};

const CATEGORY_VALUES = new Set<string>(Object.values(Category));

export function titleCase(query: string): string {
    return query
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function parseCategory(value: unknown): Category {
    if (typeof value === 'string' && CATEGORY_VALUES.has(value)) {
        return value as Category;
    }
    return Category.GENERAL;
}

function asStrings(v: unknown): string[] {
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function clampStrings(items: string[], maxLen: number, maxItems: number): string[] {
    return items.slice(0, maxItems).map((s) => s.slice(0, maxLen));
}

function parsePrimary(raw: unknown, rawQuery: string): PrimaryNodePayload {
    const fb = fallbackTopicGraph(rawQuery).primary;
    if (!raw || typeof raw !== 'object') return fb;
    const o = raw as Record<string, unknown>;
    return {
        title: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : fb.title,
        category: parseCategory(o.category),
        aiSummary:
            typeof o.aiSummary === 'string' && o.aiSummary.trim() ? o.aiSummary.trim() : fb.aiSummary,
        steps: asStrings(o.steps).length ? asStrings(o.steps) : fb.steps,
        difficulty:
            typeof o.difficulty === 'number' && o.difficulty >= 1 && o.difficulty <= 5
                ? Math.round(o.difficulty)
                : fb.difficulty,
        timeEstimate: typeof o.timeEstimate === 'string' ? o.timeEstimate : fb.timeEstimate,
        costEstimate: typeof o.costEstimate === 'string' ? o.costEstimate : fb.costEstimate,
        tools: asStrings(o.tools),
        materials: asStrings(o.materials),
        commonMistakes: asStrings(o.commonMistakes).length
            ? asStrings(o.commonMistakes)
            : fb.commonMistakes,
    };
}

function parseBranches(raw: unknown): BranchNodeSpec[] {
    if (!Array.isArray(raw)) return [];
    const out: BranchNodeSpec[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const b = item as Record<string, unknown>;
        const title = typeof b.title === 'string' ? b.title.trim() : '';
        const parentTitle = typeof b.parentTitle === 'string' ? b.parentTitle.trim() : '';
        const aiSummary = typeof b.aiSummary === 'string' ? b.aiSummary.trim() : '';
        if (title && parentTitle && aiSummary) {
            out.push({ title, parentTitle, aiSummary });
        }
    }
    return out;
}

function parseSuggestedSources(raw: unknown): SuggestedSource[] {
    if (!Array.isArray(raw)) return [];
    const out: SuggestedSource[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const s = item as Record<string, unknown>;
        const title = typeof s.title === 'string' ? s.title.trim() : '';
        const url = typeof s.url === 'string' ? s.url.trim() : '';
        if (title && url.startsWith('http')) out.push({ title, url });
    }
    return out;
}

export function normalizePathTitles(pathTitles: string[], primaryTitle: string): string[] {
    const trimmed = pathTitles.map((t) => t.trim()).filter(Boolean);
    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const t of trimmed) {
        const key = t.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(t.slice(0, LIMITS.title));
    }
    const primaryKey = primaryTitle.toLowerCase();
    if (!deduped.some((t) => t.toLowerCase() === primaryKey)) {
        deduped.push(primaryTitle.slice(0, LIMITS.title));
    }
    return deduped.slice(0, LIMITS.pathNodes);
}

export function parseTopicGraph(raw: unknown, rawQuery: string): GeneratedTopicGraph {
    if (!raw || typeof raw !== 'object') return fallbackTopicGraph(rawQuery);
    const o = raw as Record<string, unknown>;
    const primary = parsePrimary(o.primary ?? o, rawQuery);
    const pathTitles = normalizePathTitles(asStrings(o.pathTitles), primary.title);
    return clampTopicGraph({
        primary,
        pathTitles,
        branches: parseBranches(o.branches),
        disambiguationNote:
            typeof o.disambiguationNote === 'string' && o.disambiguationNote.trim()
                ? o.disambiguationNote.trim().slice(0, 500)
                : undefined,
        suggestedSources: parseSuggestedSources(o.suggestedSources),
    });
}

export function clampTopicGraph(graph: GeneratedTopicGraph): GeneratedTopicGraph {
    const primary: PrimaryNodePayload = {
        ...graph.primary,
        title: graph.primary.title.slice(0, LIMITS.title),
        aiSummary: graph.primary.aiSummary.slice(0, LIMITS.aiSummary),
        steps: clampStrings(graph.primary.steps, LIMITS.step, 30),
        tools: clampStrings(graph.primary.tools, LIMITS.listItem, 30),
        materials: clampStrings(graph.primary.materials, LIMITS.listItem, 30),
        commonMistakes: clampStrings(graph.primary.commonMistakes, LIMITS.listItem, 20),
    };

    let summary = primary.aiSummary;
    if (graph.disambiguationNote) {
        summary = `${summary}\n\nNote: ${graph.disambiguationNote}`.slice(0, LIMITS.aiSummary);
    }

    return {
        primary: { ...primary, aiSummary: summary },
        pathTitles: normalizePathTitles(graph.pathTitles, primary.title),
        branches: graph.branches.slice(0, LIMITS.branches).map((b) => ({
            title: b.title.slice(0, LIMITS.title),
            parentTitle: b.parentTitle.slice(0, LIMITS.title),
            aiSummary: b.aiSummary.slice(0, LIMITS.aiSummary),
        })),
        suggestedSources: graph.suggestedSources?.slice(0, 5),
    };
}

export function fallbackTopicGraph(rawQuery: string): GeneratedTopicGraph {
    const title = titleCase(rawQuery.trim()) || 'New topic';
    const categoryLabel = 'General';
    return clampTopicGraph({
        primary: {
            title,
            category: Category.GENERAL,
            aiSummary: `${title} covers practical steps for “${rawQuery.trim()}”. This shared answer was saved once so the next person sees the same result. Check comments and add links to improve it.`,
            steps: [
                'Confirm your goal and any safety risks before starting.',
                'Gather tools and read through all steps once.',
                'Work slowly; stop and ask in comments if something does not match your setup.',
            ],
            difficulty: 2,
            timeEstimate: 'Varies',
            costEstimate: 'Varies',
            tools: [],
            materials: [],
            commonMistakes: ['Skipping safety checks', 'Assuming all homes use the same parts'],
        },
        pathTitles: ['Home', categoryLabel, title],
        branches: [
            {
                title: 'Safety first',
                parentTitle: title,
                aiSummary: 'Turn off power or water when relevant; use PPE; call a pro for gas or mains work.',
            },
            {
                title: 'When to call a pro',
                parentTitle: title,
                aiSummary: 'If you are unsure, lack tools, or regulations apply, hire a qualified tradesperson.',
            },
        ],
    });
}

export function parseReviewResult(raw: unknown, rawQuery: string): ReviewResult | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const status = o.status === 'needs_fix' ? 'needs_fix' : o.status === 'approved' ? 'approved' : null;
    if (!status) return null;
    const issues = asStrings(o.issues).slice(0, 10);
    const revised =
        o.revised && typeof o.revised === 'object'
            ? parseTopicGraph(o.revised, rawQuery)
            : undefined;
    return { status, issues, revised };
}

/** Pure helper for tests: CHILD edges as [fromTitle, toTitle] pairs. */
export function planGraphEdges(graph: GeneratedTopicGraph): Array<[string, string]> {
    const edges: Array<[string, string]> = [];
    const path = graph.pathTitles;
    for (let i = 1; i < path.length; i += 1) {
        edges.push([path[i - 1], path[i]]);
    }
    const titles = new Set(path.map((t) => t.toLowerCase()));
    for (const b of graph.branches) {
        if (titles.has(b.parentTitle.toLowerCase())) {
            edges.push([b.parentTitle, b.title]);
            titles.add(b.title.toLowerCase());
        }
    }
    return edges;
}

export const GENERATOR_SYSTEM_PROMPT = `You help with practical home/DIY questions. Return JSON only with this shape:
{
  "primary": {
    "title": "short canonical title",
    "category": "PLUMBING|ELECTRICAL|GARDEN|CARPENTRY|CONSTRUCTION|GENERAL|TOOLS_SAFETY",
    "aiSummary": "2-4 neutral sentences answering the question (Wikipedia-style lead)",
    "steps": ["ordered procedural steps"],
    "difficulty": 1-5,
    "timeEstimate": "string",
    "costEstimate": "string",
    "tools": ["string"],
    "materials": ["string"],
    "commonMistakes": ["string"]
  },
  "pathTitles": ["Home", "…", "…", "primary title last"],
  "branches": [{ "title": "…", "parentTitle": "must exist in path or branches", "aiSummary": "1-2 sentences" }],
  "disambiguationNote": "optional if query ambiguous",
  "suggestedSources": [{ "title": "…", "url": "https://…" }]
}
Rules: pathTitles broad→narrow, last entry must match primary.title; at most 8 path nodes and 4 branches; reuse hub names like Home when fitting; be concise and factual; note safety when DIY is risky.`;

export const REVIEWER_SYSTEM_PROMPT = `You audit a draft JSON mind map + answer for a user query. Return JSON only:
{ "status": "approved" | "needs_fix", "issues": ["string"], "revised": { same schema as draft } }
revised is required when status is needs_fix. Do not change the topic unless the draft is off-topic or unsafe. Check: primary answers the query, neutral tone, valid pathTitles order, branches attach to existing titles, no dangerous certainty. Keep revised within same size limits.`;
