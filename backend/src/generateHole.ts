/**
 * AI rabbit-hole generation hook.
 * Wire an LLM here to expand a search into nodes + edges; resolveSearch calls this on a true miss.
 */
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

export async function generateRabbitHoleGraph(_query: string): Promise<GeneratedGraph | null> {
    return null
}
