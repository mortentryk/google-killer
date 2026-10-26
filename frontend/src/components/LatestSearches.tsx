import React, { useEffect, useState } from 'react';
import { getLatestSearches } from '../api/client';
import { LatestSearch } from '../types';

interface Props {
    refreshKey: number;
    onSelect: (query: string) => void;
}

const POLL_MS = 10000;

export function LatestSearches({ refreshKey, onSelect }: Props) {
    const [searches, setSearches] = useState<LatestSearch[]>([]);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [open, setOpen] = useState(true);

    useEffect(() => {
        let cancelled = false;
        let requestId = 0;

        const load = async () => {
            const id = ++requestId;
            try {
                const next = await getLatestSearches();
                if (cancelled || id !== requestId) return;
                setSearches(next);
                setStatus('ready');
            } catch (error) {
                console.error('Failed to load latest searches', error);
                if (cancelled || id !== requestId) return;
                setStatus('error');
            }
        };

        load();
        const timer = window.setInterval(load, POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [refreshKey]);

    return (
        <section
            aria-label="Latest searches"
            className="w-full max-w-2xl mx-auto px-4 pointer-events-auto"
        >
            <div className="bg-surface/95 border border-gray-700 rounded-2xl shadow-lg backdrop-blur-sm">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-white">Latest searches</h2>
                    <button
                        type="button"
                        onClick={() => setOpen((current) => !current)}
                        aria-expanded={open}
                        className="text-xs text-textSecondary hover:text-white"
                    >
                        {open ? 'Hide' : 'Show'}
                    </button>
                </div>
                {open && status === 'loading' && searches.length === 0 && (
                    <p className="px-4 pb-4 text-sm text-textSecondary">Loading searches…</p>
                )}
                {open && status === 'error' && searches.length === 0 && (
                    <p className="px-4 pb-4 text-sm text-textSecondary">Could not load searches.</p>
                )}
                {open && status === 'ready' && searches.length === 0 && (
                    <p className="px-4 pb-4 text-sm text-textSecondary">No searches yet.</p>
                )}
                {open && searches.length > 0 && (
                    <ul className="max-h-64 overflow-y-auto px-2 pb-2">
                        {searches.map((search) => (
                            <li key={search.query.toLocaleLowerCase()}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(search.query)}
                                    className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-800 transition-colors"
                                >
                                    <span className="text-sm text-text truncate">{search.query}</span>
                                    <time
                                        dateTime={search.searchedAt}
                                        className="shrink-0 text-xs text-textSecondary"
                                    >
                                        {formatSearchedAt(search.searchedAt)}
                                    </time>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

function formatSearchedAt(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
