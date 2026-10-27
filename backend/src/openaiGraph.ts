import { GeneratedGraph } from './generateHole'
import { validateGeneratedGraph } from './validateGraph'

const SYSTEM = `You build rabbit-hole mind maps as JSON only.
Rules:
- At most 15 nodes, short aiSummary (2-3 sentences).
- Include a CHILD spine from broad topic to the user's question (3-5 nodes).
- Add RELATED or ALTERNATIVE_SOLUTION branches where useful.
- focusSlug is the node that best answers the query.
- Use empty arrays for tools/materials/commonMistakes when not applicable.
- relationType is one of: CHILD, RELATED, ALTERNATIVE_SOLUTION, PREREQUISITE.`

export async function openaiGenerateRabbitHoleGraph(query: string): Promise<GeneratedGraph | null> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return null

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: SYSTEM },
                {
                    role: 'user',
                    content: `Query: ${query}\n\nReturn JSON: { "title", "focusSlug", "nodes": [{ "slug","title","aiSummary","steps","tools","materials","commonMistakes","difficulty","timeEstimate","costEstimate" }], "edges": [{ "from","to","relationType" }] }`,
                },
            ],
        }),
    })

    if (!res.ok) {
        console.error('OpenAI error', res.status, await res.text())
        return null
    }

    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = body.choices?.[0]?.message?.content
    if (!content) return null

    try {
        return validateGeneratedGraph(JSON.parse(content))
    } catch (error) {
        console.error('Invalid graph JSON from OpenAI', error)
        return null
    }
}
