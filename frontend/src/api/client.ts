import { GraphData, Node } from '../types';

const API_URL = 'http://localhost:3001';

export async function searchNodes(query: string): Promise<GraphData> {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
}

export async function getNode(id: string): Promise<Node> {
    const res = await fetch(`${API_URL}/nodes/${id}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
}
