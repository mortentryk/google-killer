import { GeneratedGraph } from '../generateHole'
import { validateGeneratedGraph } from '../validateGraph'
import { ReviewVerdict } from './reviewer'

export type OverseerDecision = {
    accept: boolean
    graph: GeneratedGraph | null
    reasons: string[]
    revisionNotes: string[]
}

/** Rule-based overseer: validates structure and reconciles writer + reviewer. */
export function overseerAgent(
    query: string,
    draft: GeneratedGraph | null,
    review: ReviewVerdict | null,
): OverseerDecision {
    const reasons: string[] = []
    const revisionNotes: string[] = []

    if (review?.graph) {
        try {
            const patched = validateGeneratedGraph(review.graph)
            reasons.push('Using reviewer-patched graph')
            return { accept: true, graph: patched, reasons, revisionNotes: [] }
        } catch (error) {
            revisionNotes.push(`Reviewer patch invalid: ${(error as Error).message}`)
        }
    }

    if (draft) {
        try {
            validateGeneratedGraph(draft)
        } catch (error) {
            revisionNotes.push(`Writer draft invalid: ${(error as Error).message}`)
            return { accept: false, graph: null, reasons, revisionNotes }
        }
    } else {
        revisionNotes.push('Writer returned no graph')
        return { accept: false, graph: null, reasons, revisionNotes }
    }

    if (review === null) {
        reasons.push('No reviewer (offline mode); schema validation only')
        return { accept: true, graph: draft, reasons, revisionNotes: [] }
    }

    if (review.approved) {
        reasons.push('Reviewer approved')
        return { accept: true, graph: draft, reasons, revisionNotes: [] }
    }

    revisionNotes.push(...review.issues)
    if (review.issues.length === 0) {
        revisionNotes.push('Reviewer rejected without issues; retry writer')
    }

    reasons.push(`Reviewer rejected graph for query: ${query.slice(0, 80)}`)
    return { accept: false, graph: null, reasons, revisionNotes }
}
