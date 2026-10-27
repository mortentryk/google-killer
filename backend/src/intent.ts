/** Stop words stripped before intent matching. */
const STOP = new Set([
    'my', 'is', 'the', 'a', 'an', 'of', 'from', 'it', 'me', 'i', 'do', 'how',
    'to', 'and', 'for', 'on', 'in', 'with', 'was', 'be', 'this', 'that', 'am',
    'what', 'why', 'when', 'can', 'should', 'would', 'could', 'fix', 'get', 'best',
])

/** Synonym groups merge to one canonical token (not per-query aliases). */
const SYNONYM_GROUPS: string[][] = [
    ['drip', 'drips', 'dripping', 'dripped', 'leak', 'leaks', 'leaking', 'leaky', 'leaked', 'wee', 'weeps', 'weeping'],
    ['broken', 'broke', 'break', 'breaks'],
    ['radiator', 'radiators', 'rad'],
    ['toilet', 'toilets', 'loo'],
    ['pipe', 'pipes', 'piping'],
]

const CANONICAL = new Map<string, string>()
for (const group of SYNONYM_GROUPS) {
    const head = group[0]
    for (const word of group) CANONICAL.set(word, head)
}

function stem(word: string): string {
    let w = word
    if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3)
    else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2)
    else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) w = w.slice(0, -1)
    if (w.length > 3 && w[w.length - 1] === w[w.length - 2]) {
        w = w.slice(0, -1)
    }
    return w
}

function canonicalToken(word: string): string {
    const s = stem(word)
    return CANONICAL.get(s) ?? s
}

/** Content-bearing tokens from any text. */
export function tokenize(text: string): string[] {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
    const out: string[] = []
    for (const word of words) {
        if (STOP.has(word)) continue
        const token = canonicalToken(word)
        if (token.length < 2) continue
        out.push(token)
    }
    return out
}

export function tokenSet(text: string): Set<string> {
    return new Set(tokenize(text))
}

/** Stable key for exact replay of the same normalized intent. */
export function intentSignature(text: string): string {
    return [...tokenSet(text)].sort().join('+')
}

export type MatchScore = {
    score: number
    overlap: number
    queryCoverage: number
    holeCoverage: number
}

export function scoreIntentMatch(query: Set<string>, hole: Set<string>): MatchScore | null {
    if (query.size === 0 || hole.size === 0) return null
    let overlap = 0
    for (const token of query) {
        if (hole.has(token)) overlap += 1
    }
    if (overlap === 0) return null
    const queryCoverage = overlap / query.size
    const holeCoverage = overlap / hole.size
    const score = queryCoverage * 0.65 + holeCoverage * 0.35
    const minOverlap = query.size === 1 ? 1 : 2
    if (overlap < minOverlap && !(query.size === hole.size && overlap === query.size)) {
        return null
    }
    if (score < 0.42 && overlap < 3) return null
    return { score, overlap, queryCoverage, holeCoverage }
}

export function pickBestHole<T extends { id: string }>(
    queryText: string,
    holes: { hole: T; vocabulary: Set<string> }[],
): { hole: T; match: MatchScore } | null {
    const query = tokenSet(queryText)
    let best: { hole: T; match: MatchScore } | null = null
    for (const candidate of holes) {
        const match = scoreIntentMatch(query, candidate.vocabulary)
        if (!match) continue
        if (
            !best
            || match.score > best.match.score
            || (match.score === best.match.score && match.overlap > best.match.overlap)
        ) {
            best = { hole: candidate.hole, match }
        }
    }
    return best
}

export function vocabularyFromTexts(texts: string[]): Set<string> {
    const vocab = new Set<string>()
    for (const text of texts) {
        for (const token of tokenSet(text)) vocab.add(token)
    }
    return vocab
}
