import { Category, RelationType } from '@prisma/client';
import prisma from '../db/client';

export type GeneratedAnswer = {
    title: string;
    category: Category;
    aiSummary: string;
    steps: string[];
    difficulty: number;
    timeEstimate: string;
    costEstimate: string;
    tools: string[];
    materials: string[];
    commonMistakes: string[];
    relatedTitles: string[];
};

const CATEGORY_VALUES = new Set<string>(Object.values(Category));

function titleCase(query: string): string {
    return query
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function fallbackAnswer(rawQuery: string): GeneratedAnswer {
    const title = titleCase(rawQuery.trim()) || 'New topic';
    return {
        title,
        category: Category.GENERAL,
        aiSummary: `Shared answer for “${rawQuery.trim()}”. This was generated once and saved so the next person gets the same result.`,
        steps: [
            'Confirm what you are trying to fix or learn.',
            'Gather tools and check safety before starting.',
            'Follow the steps below and discuss in comments if something looks wrong.',
        ],
        difficulty: 2,
        timeEstimate: 'Varies',
        costEstimate: 'Varies',
        tools: [],
        materials: [],
        commonMistakes: ['Skipping safety checks', 'Not verifying parts fit your setup'],
        relatedTitles: ['Home'],
    };
}

function parseCategory(value: unknown): Category {
    if (typeof value === 'string' && CATEGORY_VALUES.has(value)) {
        return value as Category;
    }
    return Category.GENERAL;
}

function parseGenerated(raw: unknown, rawQuery: string): GeneratedAnswer {
    if (!raw || typeof raw !== 'object') return fallbackAnswer(rawQuery);
    const o = raw as Record<string, unknown>;
    const asStrings = (v: unknown) =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

    return {
        title: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : titleCase(rawQuery),
        category: parseCategory(o.category),
        aiSummary:
            typeof o.aiSummary === 'string' && o.aiSummary.trim()
                ? o.aiSummary.trim()
                : fallbackAnswer(rawQuery).aiSummary,
        steps: asStrings(o.steps).length ? asStrings(o.steps) : fallbackAnswer(rawQuery).steps,
        difficulty:
            typeof o.difficulty === 'number' && o.difficulty >= 1 && o.difficulty <= 5
                ? Math.round(o.difficulty)
                : 2,
        timeEstimate: typeof o.timeEstimate === 'string' ? o.timeEstimate : '',
        costEstimate: typeof o.costEstimate === 'string' ? o.costEstimate : '',
        tools: asStrings(o.tools),
        materials: asStrings(o.materials),
        commonMistakes: asStrings(o.commonMistakes),
        relatedTitles: asStrings(o.relatedTitles),
    };
}

async function generateWithOpenAI(rawQuery: string): Promise<GeneratedAnswer> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return fallbackAnswer(rawQuery);

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    let res: Response;
    try {
        res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            temperature: 0.3,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content:
                        'You help with practical home/DIY questions. Return JSON only with keys: title, category (PLUMBING|ELECTRICAL|GARDEN|CARPENTRY|CONSTRUCTION|GENERAL|TOOLS_SAFETY), aiSummary, steps (string[]), difficulty (1-5), timeEstimate, costEstimate, tools, materials, commonMistakes, relatedTitles (existing topic names to link in a mind map, e.g. Home, Plumbing). Be concise and factual.',
                },
                { role: 'user', content: rawQuery },
            ],
        }),
    });
    } catch (error) {
        console.error('OpenAI request failed', error);
        return fallbackAnswer(rawQuery);
    } finally {
        clearTimeout(timeout);
    }

    if (!res.ok) {
        console.error('OpenAI error', await res.text());
        return fallbackAnswer(rawQuery);
    }

    const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return fallbackAnswer(rawQuery);

    try {
        return parseGenerated(JSON.parse(content), rawQuery);
    } catch {
        return fallbackAnswer(rawQuery);
    }
}

async function linkRelatedNodes(primaryNodeId: string, relatedTitles: string[]) {
    for (const title of relatedTitles) {
        const related = await prisma.node.findFirst({
            where: { title: { equals: title, mode: 'insensitive' } },
        });
        if (!related || related.id === primaryNodeId) continue;

        await prisma.edge.upsert({
            where: {
                fromNodeId_toNodeId_relationType: {
                    fromNodeId: related.id,
                    toNodeId: primaryNodeId,
                    relationType: RelationType.CHILD,
                },
            },
            create: {
                fromNodeId: related.id,
                toNodeId: primaryNodeId,
                relationType: RelationType.CHILD,
            },
            update: {},
        });
    }
}

const LIMITS = {
    title: 200,
    aiSummary: 4000,
    step: 500,
    listItem: 200,
};

function clampStrings(items: string[], maxLen: number, maxItems: number): string[] {
    return items.slice(0, maxItems).map((s) => s.slice(0, maxLen));
}

export async function createTopicFromGeneration(rawQuery: string): Promise<string> {
    const generated = await generateWithOpenAI(rawQuery);
    generated.title = generated.title.slice(0, LIMITS.title);
    generated.aiSummary = generated.aiSummary.slice(0, LIMITS.aiSummary);
    generated.steps = clampStrings(generated.steps, LIMITS.step, 30);
    generated.tools = clampStrings(generated.tools, LIMITS.listItem, 30);
    generated.materials = clampStrings(generated.materials, LIMITS.listItem, 30);
    generated.commonMistakes = clampStrings(generated.commonMistakes, LIMITS.listItem, 20);
    generated.relatedTitles = clampStrings(generated.relatedTitles, LIMITS.title, 10);

    const primary = await prisma.node.create({
        data: {
            title: generated.title,
            category: generated.category,
            aiSummary: generated.aiSummary,
            steps: generated.steps,
            difficulty: generated.difficulty,
            timeEstimate: generated.timeEstimate,
            costEstimate: generated.costEstimate,
            tools: generated.tools,
            materials: generated.materials,
            commonMistakes: generated.commonMistakes,
        },
    });

    await linkRelatedNodes(primary.id, generated.relatedTitles);

    // Link to Home only when the model did not place this under a more specific parent.
    const linkedParent = generated.relatedTitles.some(
        (t) => t.toLowerCase() !== 'home' && t.length > 0
    );
    if (!linkedParent) {
        const home = await prisma.node.findFirst({
            where: { title: { equals: 'Home', mode: 'insensitive' } },
        });
        if (home && home.id !== primary.id) {
            await prisma.edge.upsert({
                where: {
                    fromNodeId_toNodeId_relationType: {
                        fromNodeId: home.id,
                        toNodeId: primary.id,
                        relationType: RelationType.CHILD,
                    },
                },
                create: {
                    fromNodeId: home.id,
                    toNodeId: primary.id,
                    relationType: RelationType.CHILD,
                },
                update: {},
            });
        }
    }

    return primary.id;
}
