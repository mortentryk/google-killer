export function slugify(normalizedQuery: string): string {
    const base = normalizedQuery
        .slice(0, 80)
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return base || 'topic';
}

export function slugWithSuffix(base: string, suffix: number): string {
    return suffix === 0 ? base : `${base}-${suffix}`;
}
