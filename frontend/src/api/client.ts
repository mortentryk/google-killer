import { GraphData, Node, Comment, WebLink, RecentSearch } from '../types';
import { getApiBase } from './config';
import { parseGraphPayload, parseNode } from '../utils/parseNode';
import { errorFromBody, readJsonBody } from './http';

async function apiFetch(path: string, init?: RequestInit) {
    const res = await fetch(`${getApiBase()}${path}`, init);
    return res;
}

async function parseGraphResponse(res: Response): Promise<GraphData> {
    const body = await readJsonBody(res);
    if (!res.ok) {
        throw new Error(errorFromBody(body, 'Request failed'));
    }
    return parseGraphPayload(body as Record<string, unknown>);
}

export async function getRecentSearches(limit = 12): Promise<RecentSearch[]> {
    const res = await apiFetch(`/searches/recent?limit=${limit}`);
    const body = await readJsonBody(res);
    if (!res.ok) {
        throw new Error(errorFromBody(body, 'Failed to load recent searches'));
    }
    if (!Array.isArray(body)) {
        throw new Error('Failed to load recent searches');
    }
    return body as RecentSearch[];
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
    const body = await readJsonBody(res);
    if (!res.ok) throw new Error(errorFromBody(body, 'Failed to fetch node'));
    return parseNode(body as Record<string, unknown>);
}

export async function getComments(nodeId: string): Promise<Comment[]> {
    const res = await apiFetch(`/nodes/${nodeId}/comments`);
    const body = await readJsonBody(res);
    if (!res.ok) {
        throw new Error(errorFromBody(body, 'Failed to load comments'));
    }
    if (!Array.isArray(body)) {
        throw new Error('Failed to load comments');
    }
    return body as Comment[];
}

export async function postComment(
    nodeId: string,
    text: string,
    authorName?: string,
    honeypot?: string
): Promise<Comment> {
    const res = await apiFetch(`/nodes/${nodeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, authorName, website: honeypot ?? '' }),
    });
    const body = await readJsonBody(res);
    if (!res.ok) {
        throw new Error(errorFromBody(body, 'Failed to post comment'));
    }
    return body as Comment;
}

export async function getWebLinks(nodeId: string): Promise<WebLink[]> {
    const res = await apiFetch(`/nodes/${nodeId}/links`);
    const body = await readJsonBody(res);
    if (!res.ok) {
        throw new Error(errorFromBody(body, 'Failed to load links'));
    }
    if (!Array.isArray(body)) {
        throw new Error('Failed to load links');
    }
    return body as WebLink[];
}

export async function postWebLink(
    nodeId: string,
    url: string,
    title?: string,
    authorName?: string,
    honeypot?: string
): Promise<WebLink> {
    const res = await apiFetch(`/nodes/${nodeId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, authorName, website: honeypot ?? '' }),
    });
    const body = await readJsonBody(res);
    if (!res.ok) {
        throw new Error(errorFromBody(body, 'Failed to add link'));
    }
    return body as WebLink;
}
