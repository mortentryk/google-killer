import { tokenSet } from './intent'
import { GeneratedGraph } from './generateHole'

const emptyMeta = {
    steps: [] as string[],
    tools: [] as string[],
    materials: [] as string[],
    commonMistakes: [] as string[],
    difficulty: 1,
    timeEstimate: '',
    costEstimate: '',
}

/** Demo-quality graph when no LLM key is configured (still persisted once per intent). */
export function offlineGenerateRabbitHoleGraph(query: string): GeneratedGraph {
    const tokens = tokenSet(query)
    if (tokens.has('moon') && (tokens.has('land') || query.toLowerCase().includes('landing'))) {
        return moonLandingGraph(query)
    }
    return genericExplorationGraph(query, tokens)
}

function moonLandingGraph(query: string): GeneratedGraph {
    return {
        title: 'Moon landing',
        focusSlug: 'moon-landing',
        nodes: [
            {
                slug: 'moon',
                title: 'Moon',
                aiSummary: 'Earth’s natural satellite. Crewed landings were the goal of the Apollo program in the 1960s–70s.',
                ...emptyMeta,
            },
            {
                slug: 'space-program',
                title: 'Space program',
                aiSummary: 'National effort to reach the Moon: rockets, capsules, training, and ground tracking networks.',
                ...emptyMeta,
            },
            {
                slug: 'moon-landing',
                title: 'Moon landing',
                aiSummary: 'Apollo 11 (1969) and later missions put astronauts on the lunar surface. This node answers your question in depth.',
                steps: [
                    'Separate primary sources (telemetry, photos, independent tracking) from opinion.',
                    'Compare hoax claims to what each claim would require to fake.',
                    'Read consensus summaries from space agencies and historians.',
                ],
                difficulty: 2,
                timeEstimate: '20 min read',
                costEstimate: '0',
                tools: [],
                materials: [],
                commonMistakes: ['Treating one anomaly in a photo as proof the whole program was fake.'],
            },
            {
                slug: 'apollo-evidence',
                title: 'Apollo evidence',
                aiSummary: 'Laser retroreflectors left on the Moon, independent radio tracking, lunar samples studied worldwide.',
                ...emptyMeta,
            },
            {
                slug: 'hoax-claims',
                title: 'Hoax claims',
                aiSummary: 'Common arguments (flags, shadows, stars) and why they are addressed by physics and primary records.',
                ...emptyMeta,
            },
            {
                slug: 'your-question',
                title: query.trim().replace(/\?$/, '') || 'Is the moon landing real?',
                aiSummary: 'Short answer: the weight of evidence supports real crewed landings; details live in the branch nodes.',
                ...emptyMeta,
            },
        ],
        edges: [
            { from: 'moon', to: 'space-program', relationType: 'CHILD' },
            { from: 'space-program', to: 'moon-landing', relationType: 'CHILD' },
            { from: 'moon-landing', to: 'apollo-evidence', relationType: 'RELATED' },
            { from: 'moon-landing', to: 'hoax-claims', relationType: 'RELATED' },
            { from: 'moon-landing', to: 'your-question', relationType: 'CHILD' },
        ],
    }
}

function genericExplorationGraph(query: string, tokens: Set<string>): GeneratedGraph {
    const words = [...tokens].slice(0, 4)
    const rootSlug = words[0] || 'topic'
    const rootTitle = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Topic'
    const focusSlug = 'focus'
    const nodes = [
        {
            slug: rootSlug,
            title: rootTitle,
            aiSummary: `Overview of ${rootTitle} as it relates to your search.`,
            ...emptyMeta,
        },
        {
            slug: 'context',
            title: 'Context',
            aiSummary: `Background you need before going deeper into ${rootTitle}.`,
            ...emptyMeta,
        },
        {
            slug: focusSlug,
            title: query.trim().replace(/\?$/, '') || rootTitle,
            aiSummary: `Core answer path for: ${query}. Branches hold related angles.`,
            steps: ['Start with the summary', 'Open branch nodes for detail', 'Compare alternatives'],
            difficulty: 2,
            timeEstimate: '10 min',
            costEstimate: '0',
            tools: [],
            materials: [],
            commonMistakes: ['Skipping the context node when terms are unfamiliar.'],
        },
    ]
    if (words.length > 1) {
        nodes.push({
            slug: 'related',
            title: `More on ${words[1]}`,
            aiSummary: `Related ideas connected to ${words[1]}.`,
            ...emptyMeta,
        })
    }
    const edges: GeneratedGraph['edges'] = [
        { from: rootSlug, to: 'context', relationType: 'CHILD' },
        { from: 'context', to: focusSlug, relationType: 'CHILD' },
    ]
    if (words.length > 1) {
        edges.push({ from: focusSlug, to: 'related', relationType: 'RELATED' })
    }
    return {
        title: rootTitle,
        focusSlug,
        nodes,
        edges,
    }
}
