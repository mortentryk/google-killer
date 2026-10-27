export type OpenAiRole = 'writer' | 'reviewer'

/** Writer: cheap/fast. Reviewer: stronger default for QA. OPENAI_MODEL applies to both when role-specific vars unset. */
export function resolveOpenAiModel(role: OpenAiRole): string {
    const shared = process.env.OPENAI_MODEL?.trim()
    if (role === 'writer') {
        return process.env.OPENAI_WRITER_MODEL?.trim() || shared || 'gpt-4o-mini'
    }
    return process.env.OPENAI_REVIEWER_MODEL?.trim() || shared || 'gpt-4o'
}
