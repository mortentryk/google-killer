import { runGenerationPipeline, GenerationAudit } from './generationPipeline'
import { GeneratedGraph } from './generateHole'

export async function openaiGenerateRabbitHoleGraph(
    query: string,
): Promise<{ graph: GeneratedGraph; audit: GenerationAudit } | null> {
    if (!process.env.OPENAI_API_KEY) return null
    try {
        const result = await runGenerationPipeline(query)
        if (process.env.GENERATION_AUDIT_LOG === '1') {
            console.info('Generation audit', JSON.stringify(result.audit, null, 2))
        }
        return result
    } catch (error) {
        console.error('Generation pipeline failed', error)
        return null
    }
}
