import { offlineGenerateRabbitHoleGraph } from './offlineGraph'
import { openaiGenerateRabbitHoleGraph } from './openaiGraph'
import { GenerationAudit } from './generationPipeline'

export type GeneratedGraph = {
    title: string
    nodes: {
        slug: string
        title: string
        aiSummary: string
        steps: string[]
        tools: string[]
        materials: string[]
        commonMistakes: string[]
        difficulty: number
        timeEstimate: string
        costEstimate: string
    }[]
    edges: { from: string; to: string; relationType: 'CHILD' | 'RELATED' | 'ALTERNATIVE_SOLUTION' | 'PREREQUISITE' }[]
    focusSlug: string
}

export type GenerateResult = {
    graph: GeneratedGraph
    audit: GenerationAudit
}

/** Writer + reviewer + overseer on cache miss when OpenAI is configured; else offline template. */
export async function generateRabbitHoleGraph(query: string): Promise<GenerateResult> {
    const fromOpenAi = await openaiGenerateRabbitHoleGraph(query)
    if (fromOpenAi) return fromOpenAi
    return {
        graph: offlineGenerateRabbitHoleGraph(query),
        audit: {
            rounds: [{
                writer: true,
                reviewerApproved: null,
                overseerAccept: true,
                reasons: ['Offline template; reviewer skipped'],
                issues: [],
            }],
            finalSource: 'offline',
        },
    }
}
