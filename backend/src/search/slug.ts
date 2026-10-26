import prisma from '../db/client';

export function slugify(normalizedQuery: string): string {
    const base = normalizedQuery
        .slice(0, 80)
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return base || 'topic';
}

export async function allocateSlug(normalizedQuery: string): Promise<string> {
    let candidate = slugify(normalizedQuery);
    let suffix = 0;

    while (true) {
        const slug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
        const taken = await prisma.searchTopic.findUnique({ where: { slug } });
        if (!taken) return slug;
        suffix += 1;
    }
}
