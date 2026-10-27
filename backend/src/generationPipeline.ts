import { GeneratedGraph } from './generateHole'
import { overseerAgent } from './agents/overseer'
import { reviewerAgent } from './agents/reviewer'
import { writerAgent } from './agents/writer'

export type GenerationAudit = {
    rounds: {
        writer: boolean
        reviewerApproved: boolean | null
        overseerAccept: boolean
        reasons: string[]
        issues: string[]
    }[]
    finalSource: 'writer' | 'reviewer_patch' | 'offline'
}

const MAX_ROUNDS = Number(process.env.GENERATION_MAX_REVIEW_ROUNDS ?? 2)

export async function runGenerationPipeline(query: string): Promise<{ graph: GeneratedGraph; audit: GenerationAudit }> {
    const audit: GenerationAudit = { rounds: [], finalSource: 'writer' }
    let revisionNotes: string[] = []

    for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const draft = await writerAgent(query, revisionNotes.length ? revisionNotes : undefined)
        const review = process.env.OPENAI_API_KEY ? await (draft ? reviewerAgent(query, draft) : Promise.resolve(null)) : null
        const decision = overseerAgent(query, draft, review)

        audit.rounds.push({
            writer: Boolean(draft),
            reviewerApproved: review?.approved ?? null,
            overseerAccept: decision.accept,
            reasons: decision.reasons,
            issues: decision.revisionNotes,
        })

        if (decision.accept && decision.graph) {
            audit.finalSource = decision.reasons.some(reason => reason.includes('reviewer-patched'))
                ? 'reviewer_patch'
                : 'writer'
            return { graph: decision.graph, audit }
        }

        revisionNotes = decision.revisionNotes
    }

    const fallback = await writerAgent(query, revisionNotes)
    if (!fallback) throw new Error('Generation pipeline failed')

    audit.finalSource = 'writer'
    return { graph: fallback, audit }
}
