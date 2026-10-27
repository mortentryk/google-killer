import { GeneratedGraph } from '../generateHole'
import { openaiJsonChat } from '../openaiClient'
import { validateGeneratedGraph } from '../validateGraph'

export type ReviewVerdict = {
    approved: boolean
    issues: string[]
    graph?: GeneratedGraph
}

const SYSTEM = `You are the REVIEWER agent. You inspect a rabbit-hole graph for a user query.
Check: (1) graph answers the query, (2) CHILD spine exists, (3) focusSlug is sensible,
(4) no dangerous DIY advice without safety steps, (5) summaries are coherent.
Return JSON only: { "approved": boolean, "issues": string[], "graph": <full graph or omit> }.
If you fix problems, include the full corrected graph in "graph". If approved with no changes, omit "graph".`

export async function reviewerAgent(query: string, draft: GeneratedGraph): Promise<ReviewVerdict | null> {
    const raw = await openaiJsonChat(
        SYSTEM,
        `Query: ${query}\n\nDraft graph JSON:\n${JSON.stringify(draft)}`,
    )
    if (!raw || typeof raw !== 'object') return null

    const verdict = raw as Record<string, unknown>
    const approved = verdict.approved === true
    const issues = Array.isArray(verdict.issues)
        ? verdict.issues.filter((item): item is string => typeof item === 'string')
        : []

    let graph: GeneratedGraph | undefined
    if (verdict.graph) {
        try {
            graph = validateGeneratedGraph(verdict.graph)
        } catch (error) {
            issues.push('Reviewer patch failed validation')
            console.error('Reviewer graph invalid', error)
        }
    }

    return { approved, issues, graph }
}
