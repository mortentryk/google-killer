const HUB_SLUGS = new Set(['home']);
const HUB_TITLES = new Set(['home']);

export function isHubTrailStep(slug: string, displayQuery: string): boolean {
    const s = slug.trim().toLowerCase();
    const q = displayQuery.trim().toLowerCase();
    return HUB_SLUGS.has(s) || HUB_TITLES.has(q);
}
