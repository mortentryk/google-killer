import { JourneyStep } from '../types';

const HUB_SLUGS = new Set(['home']);
const HUB_TITLES = new Set(['home']);

export function isHubTrailStep(slug: string, displayQuery: string): boolean {
    const s = slug.trim().toLowerCase();
    const q = displayQuery.trim().toLowerCase();
    return HUB_SLUGS.has(s) || HUB_TITLES.has(q);
}

/** Clean trail for display: drop hub nodes and consecutive duplicates. */
export function compactTrailSteps(steps: JourneyStep[]): JourneyStep[] {
    const out: JourneyStep[] = [];
    for (const step of steps) {
        if (isHubTrailStep(step.slug, step.displayQuery)) continue;
        const prev = out[out.length - 1];
        if (prev && prev.slug === step.slug) continue;
        out.push(step);
    }
    return out;
}
