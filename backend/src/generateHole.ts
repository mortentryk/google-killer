import { offlineGenerateRabbitHoleGraph } from './offlineGraph'
import { openaiGenerateRabbitHoleGraph } from './openaiGraph'

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

/** One LLM call on cache miss; offline template if no API key. */
export async function generateRabbitHoleGraph(query: string): Promise<GeneratedGraph> {
    const fromOpenAi = await openaiGenerateRabbitHoleGraph(query)
    if (fromOpenAi) return fromOpenAi
    return offlineGenerateRabbitHoleGraph(query)
}
