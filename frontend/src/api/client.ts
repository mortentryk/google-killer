import { GraphData, Node } from '../types';

const API_URL = 'http://localhost:3001';

export async function searchNodes(query: string): Promise<GraphData> {
    // Mock response for now if API fails or is not ready
    try {
        const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
    } catch (e) {
        console.warn('API fetch failed, returning mock data', e);
        return {
            nodes: [
                {
                    id: '1',
                    title: 'Home',
                    category: 'GENERAL',
                    aiSummary: 'Root node',
                    steps: [],
                    difficulty: 1,
                    timeEstimate: '',
                    costEstimate: '',
                    tools: [],
                    materials: [],
                    commonMistakes: [],
                    createdAt: '',
                    updatedAt: ''
                } as any
            ],
            edges: [],
            path: ['1']
        };
    }
}

export async function getNode(id: string): Promise<Node> {
    const res = await fetch(`${API_URL}/nodes/${id}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
}
