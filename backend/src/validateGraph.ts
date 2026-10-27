import { GeneratedGraph } from './generateHole'

const MAX_NODES = 18
const MAX_SUMMARY = 600
const RELATION_TYPES = new Set(['CHILD', 'RELATED', 'ALTERNATIVE_SOLUTION', 'PREREQUISITE'])

export function validateGeneratedGraph(raw: unknown): GeneratedGraph {
    if (!raw || typeof raw !== 'object') throw new Error('Graph must be an object')
    const graph = raw as Record<string, unknown>
    if (typeof graph.title !== 'string' || !graph.title.trim()) throw new Error('Graph title required')
    if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) throw new Error('Graph needs nodes')
    if (graph.nodes.length > MAX_NODES) throw new Error(`At most ${MAX_NODES} nodes`)
    if (!Array.isArray(graph.edges)) throw new Error('Graph needs edges')
    if (typeof graph.focusSlug !== 'string') throw new Error('focusSlug required')

    const slugs = new Set<string>()
    const nodes = graph.nodes.map((node, index) => {
        if (!node || typeof node !== 'object') throw new Error(`Node ${index} invalid`)
        const n = node as Record<string, unknown>
        const slug = typeof n.slug === 'string' ? n.slug.trim() : ''
        const title = typeof n.title === 'string' ? n.title.trim() : ''
        const aiSummary = typeof n.aiSummary === 'string' ? n.aiSummary.trim() : ''
        if (!slug || !title || !aiSummary) throw new Error(`Node ${index} missing slug, title, or aiSummary`)
        if (aiSummary.length > MAX_SUMMARY) throw new Error(`Node ${index} summary too long`)
        if (slugs.has(slug)) throw new Error(`Duplicate slug ${slug}`)
        slugs.add(slug)
        return {
            slug,
            title,
            aiSummary,
            steps: stringArray(n.steps, `nodes[${index}].steps`),
            tools: stringArray(n.tools, `nodes[${index}].tools`),
            materials: stringArray(n.materials, `nodes[${index}].materials`),
            commonMistakes: stringArray(n.commonMistakes, `nodes[${index}].commonMistakes`),
            difficulty: clampInt(n.difficulty, 1, 5, 2),
            timeEstimate: typeof n.timeEstimate === 'string' ? n.timeEstimate : '',
            costEstimate: typeof n.costEstimate === 'string' ? n.costEstimate : '',
        }
    })

    if (!slugs.has(graph.focusSlug)) throw new Error('focusSlug must match a node slug')

    const edges = graph.edges.map((edge, index) => {
        if (!edge || typeof edge !== 'object') throw new Error(`Edge ${index} invalid`)
        const e = edge as Record<string, unknown>
        const from = typeof e.from === 'string' ? e.from : ''
        const to = typeof e.to === 'string' ? e.to : ''
        const relationType = typeof e.relationType === 'string' ? e.relationType : 'CHILD'
        if (!from || !to || !slugs.has(from) || !slugs.has(to)) {
            throw new Error(`Edge ${index} references unknown slugs`)
        }
        if (!RELATION_TYPES.has(relationType)) throw new Error(`Edge ${index} bad relationType`)
        return { from, to, relationType: relationType as GeneratedGraph['edges'][0]['relationType'] }
    })

    return {
        title: graph.title.trim(),
        nodes,
        edges,
        focusSlug: graph.focusSlug,
    }
}

function stringArray(value: unknown, label: string): string[] {
    if (value === undefined) return []
    if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
    return value.map((item, i) => {
        if (typeof item !== 'string') throw new Error(`${label}[${i}] must be a string`)
        return item.trim()
    }).filter(Boolean)
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n)))
}
