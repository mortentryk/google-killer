export async function readJsonBody(res: Response): Promise<unknown> {
    const text = await res.text();

    if (!text.trim()) {
        if (!res.ok) {
            throw new Error(`Request failed (${res.status})`);
        }
        return {};
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        const preview = text.slice(0, 80).replace(/\s+/g, ' ').trim();
        if (/proxy error/i.test(text)) {
            throw new Error(
                'Cannot reach the API. Start the backend (npm run dev in backend/) on port 3001.'
            );
        }
        throw new Error(preview || `Invalid server response (${res.status})`);
    }
}

export function errorFromBody(body: unknown, fallback: string): string {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
        const err = (body as Record<string, unknown>).error;
        if (typeof err === 'string') return err;
    }
    return fallback;
}
