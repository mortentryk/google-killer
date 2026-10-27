import { GeneratedGraph } from '../generateHole'
import { openaiJsonChat } from '../openaiClient'
import { validateGeneratedGraph } from '../validateGraph'

const SYSTEM = `You are the WRITER agent. Build rabbit-hole mind maps as JSON only.
Rules:
- At most 15 nodes, short aiSummary (2-3 sentences).
- Include a CHILD spine from broad topic to the user's question (3-5 nodes).
- Add RELATED or ALTERNATIVE_SOLUTION branches where useful.
- focusSlug is the node that best answers the query.
- Use empty arrays for tools/materials/commonMistakes when not applicable.
- relationType is one of: CHILD, RELATED, ALTERNATIVE_SOLUTION, PREREQUISITE.`

export async function writerAgent(query: string, revisionNotes?: string[]): Promise<GeneratedGraph | null> {
    const revision = revisionNotes?.length
        ? `\n\nReviewer asked for fixes:\n${revisionNotes.map(note => `- ${note}`).join('\n')}`
        : ''

    const raw = await openaiJsonChat(
        SYSTEM,
        `Query: ${query}${revision}\n\nReturn JSON: { "title", "focusSlug", "nodes": [...], "edges": [...] }`,
        'writer',
    )
    if (!raw) return null

    try {
        return validateGeneratedGraph(raw)
    } catch (error) {
        console.error('Writer produced invalid graph', error)
        return null
    }
}
