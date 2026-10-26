import React, { useEffect, useState } from 'react';
import { WebLink } from '../types';
import { getWebLinks, postWebLink } from '../api/client';

interface Props {
    nodeId: string;
}

function linkLabel(link: WebLink): string {
    if (link.title.trim()) return link.title.trim();
    try {
        return new URL(link.url).hostname.replace(/^www\./, '');
    } catch {
        return link.url;
    }
}

function linkHost(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export function ManualLinksSection({ nodeId }: Props) {
    const [links, setLinks] = useState<WebLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [honeypot, setHoneypot] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getWebLinks(nodeId)
            .then((data) => {
                if (!cancelled) setLinks(data);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load links');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [nodeId]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        setPosting(true);
        setError(null);
        try {
            const created = await postWebLink(nodeId, url, title || undefined, authorName || undefined, honeypot);
            setLinks((prev) => [...prev, created]);
            setUrl('');
            setTitle('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add link');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="mt-8 border-t border-[#ebebeb] pt-6">
            <h2 className="text-base text-[#202124] font-medium mb-1">Web results (added by people)</h2>
            <p className="text-sm text-[#70757a] mb-4">
                Add a link to your site or any page that helps — like a manual Google result for this answer.
            </p>

            {loading && <p className="text-sm text-[#70757a]">Loading links…</p>}
            {error && <p className="text-sm text-[#d93025] mb-3">{error}</p>}

            <div className="space-y-5 mb-6">
                {links.map((link) => (
                    <article key={link.id} className="max-w-xl">
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xl text-[#1a0dab] hover:underline leading-snug block"
                        >
                            {linkLabel(link)}
                        </a>
                        <div className="text-sm text-[#006621] truncate">{linkHost(link.url)}</div>
                        <p className="text-xs text-[#70757a] mt-1">Added by {link.authorName}</p>
                    </article>
                ))}
                {!loading && links.length === 0 && !error && (
                    <p className="text-sm text-[#70757a]">No links yet. Be the first to suggest a site.</p>
                )}
            </div>

            <form onSubmit={onSubmit} className="space-y-2 max-w-xl">
                <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden
                    className="hidden"
                />
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-site.com/helpful-page"
                    className="w-full border border-[#dfe1e5] rounded px-3 py-2 text-sm"
                    required
                />
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Page title (optional)"
                    className="w-full border border-[#dfe1e5] rounded px-3 py-2 text-sm"
                />
                <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full border border-[#dfe1e5] rounded px-3 py-2 text-sm"
                />
                <button
                    type="submit"
                    disabled={posting || !url.trim()}
                    className="bg-[#f8f9fa] border border-[#dadce0] hover:bg-[#f1f8ff] text-[#1a73e8] text-sm px-4 py-2 rounded disabled:opacity-50"
                >
                    {posting ? 'Adding…' : 'Add link'}
                </button>
            </form>
        </div>
    );
}
