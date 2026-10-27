import { OpenAiRole, resolveOpenAiModel } from './openaiModels'

export async function openaiJsonChat(
    system: string,
    user: string,
    role: OpenAiRole,
): Promise<unknown | null> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return null

    const model = resolveOpenAiModel(role)
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            temperature: 0.3,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
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
        return JSON.parse(content)
    } catch (error) {
        console.error('OpenAI returned non-JSON', error)
        return null
    }
}
