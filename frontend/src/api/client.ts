import { GraphData, Node } from '../types';

/** Production: same-origin `/api` via Vercel rewrite. Local: `REACT_APP_API_URL` in `.env.development`. */
const API_BASE = (process.env.REACT_APP_API_URL ?? '/api').replace(/\/$/, '');

function apiPath(path: string): string {
    return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function searchNodes(query: string): Promise<GraphData> {
    const res = await fetch(`${apiPath('/search')}?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
}

export async function getNode(id: string): Promise<Node> {
    const res = await fetch(apiPath(`/nodes/${id}`));
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
}
