export const LATEST_SEARCH_LIMIT = 12;
export const LATEST_SEARCH_SCAN = 100;
export const MAX_QUERY_LENGTH = 200;

export function normalizeSearchQuery(raw: string): string | null {
    const query = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH);
    return query.length > 0 ? query : null;
}

export interface SearchRow {
    query: string;
    createdAt: Date;
}

export interface LatestSearch {
    query: string;
    searchedAt: string;
}

export function toLatestSearches(
    rows: SearchRow[],
    limit = LATEST_SEARCH_LIMIT
): LatestSearch[] {
    const seen = new Set<string>();
    const searches: LatestSearch[] = [];

    for (const row of rows) {
        const key = row.query.toLocaleLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        searches.push({
            query: row.query,
            searchedAt: row.createdAt.toISOString(),
        });
        if (searches.length === limit) break;
    }

    return searches;
}
