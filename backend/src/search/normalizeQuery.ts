export function normalizeQuery(raw: string): string {
    return raw
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function queryTokens(normalized: string): string[] {
    return normalized.split(' ').filter((t) => t.length > 1);
}
