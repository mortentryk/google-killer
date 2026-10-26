import { GraphData, Node, Comment } from '../types';
import { getApiBase } from './config';
import { parseGraphPayload, parseNode } from '../utils/parseNode';

async function apiFetch(path: string, init?: RequestInit) {
    const res = await fetch(`${getApiBase()}${path}`, init);
    return res;
}

async function parseGraphResponse(res: Response): Promise<GraphData> {
    const body = await res.json();
    if (!res.ok) {
        throw new Error(body.error || 'Request failed');
    }
    return parseGraphPayload(body);
}

export async function searchNodes(query: string): Promise<GraphData> {
    const res = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
    return parseGraphResponse(res);
}

export async function getTopicBySlug(slug: string): Promise<GraphData> {
    const res = await apiFetch(`/topics/${encodeURIComponent(slug)}`);
    return parseGraphResponse(res);
}

export async function getNode(id: string): Promise<Node> {
    const res = await apiFetch(`/nodes/${id}`);
    if (!res.ok) throw new Error('Failed to fetch node');
    const body = await res.json();
    return parseNode(body);
}

export async function getComments(nodeId: string): Promise<Comment[]> {
    const res = await apiFetch(`/nodes/${nodeId}/comments`);
    if (!res.ok) throw new Error('Failed to load comments');
    return res.json();
}

export async function postComment(
    nodeId: string,
    text: string,
    authorName?: string
): Promise<Comment> {
    const res = await apiFetch(`/nodes/${nodeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, authorName }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to post comment');
    }
    return res.json();
}
