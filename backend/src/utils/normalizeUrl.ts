export function normalizeHttpUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    try {
        const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        const url = new URL(withScheme);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }
        if (!url.hostname || url.hostname.length < 3) {
            return null;
        }
        return url.toString().slice(0, 2048);
    } catch {
        return null;
    }
}

export function displayHost(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}
