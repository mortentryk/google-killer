export type ChatUsage = {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
};

export type ChatJsonResult = {
    parsed: unknown;
    usage?: ChatUsage;
    model: string;
};

export function isOpenAIConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function chatJson(
    systemPrompt: string,
    userPrompt: string,
    options?: { model?: string; timeoutMs?: number; temperature?: number }
): Promise<ChatJsonResult | null> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return null;

    const model = options?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const timeoutMs = options?.timeoutMs ?? 25_000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                temperature: options?.temperature ?? 0.3,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            }),
        });

        if (!res.ok) {
            console.error('OpenAI error', await res.text());
            return null;
        }

        const body = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: ChatUsage;
        };
        const content = body.choices?.[0]?.message?.content;
        if (!content) return null;

        try {
            return {
                parsed: JSON.parse(content) as unknown,
                usage: body.usage,
                model,
            };
        } catch {
            return null;
        }
    } catch (error) {
        console.error('OpenAI request failed', error);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

export function mergeUsage(a?: ChatUsage, b?: ChatUsage): ChatUsage | undefined {
    if (!a && !b) return undefined;
    return {
        prompt_tokens: (a?.prompt_tokens ?? 0) + (b?.prompt_tokens ?? 0),
        completion_tokens: (a?.completion_tokens ?? 0) + (b?.completion_tokens ?? 0),
        total_tokens: (a?.total_tokens ?? 0) + (b?.total_tokens ?? 0),
    };
}
