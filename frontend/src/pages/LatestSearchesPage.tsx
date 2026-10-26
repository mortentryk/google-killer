import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { getLatestSearches } from '../api/client';
import { LatestSearchFeedItem } from '../types';
import { formatRelativeTime } from '../utils/time';

const POLL_MS = 15000;

export default function LatestSearchesPage() {
    const navigate = useNavigate();
    const [draft, setDraft] = useState('');
    const [searches, setSearches] = useState<LatestSearchFeedItem[]>([]);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [nicheFilter, setNicheFilter] = useState('All');

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const next = await getLatestSearches();
                if (cancelled) return;
                setSearches(next);
                setStatus('ready');
            } catch (error) {
                console.error('Failed to load latest searches', error);
                if (cancelled) return;
                setStatus('error');
            }
        };

        load();
        const timer = window.setInterval(load, POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);

    const niches = useMemo(() => {
        const values = new Set(searches.map((item) => item.niche));
        return ['All', ...Array.from(values).sort()];
    }, [searches]);

    const filtered = useMemo(() => {
        if (nicheFilter === 'All') return searches;
        return searches.filter((item) => item.niche === nicheFilter);
    }, [searches, nicheFilter]);

    const openRabbitHole = (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        navigate(`/topic?q=${encodeURIComponent(trimmed)}`);
    };

    return (
        <div className="min-h-screen bg-background text-text">
            <header className="border-b border-gray-800 bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-6">
                    <p className="text-sm text-primary font-medium mb-1">Community searches</p>
                    <h1 className="text-2xl font-bold text-white mb-2">Latest searches in your niche</h1>
                    <p className="text-sm text-textSecondary mb-4">
                        See what people are looking for, open the rabbit hole, and leave a comment to improve the answer.
                    </p>
                    <SearchBar query={draft} onQueryChange={setDraft} onSearch={openRabbitHole} />
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex flex-wrap gap-2 mb-6">
                    {niches.map((niche) => (
                        <button
                            key={niche}
                            type="button"
                            onClick={() => setNicheFilter(niche)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                nicheFilter === niche
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-gray-700 text-textSecondary hover:text-white hover:border-gray-500'
                            }`}
                        >
                            {niche}
                        </button>
                    ))}
                </div>

                {status === 'loading' && searches.length === 0 && (
                    <p className="text-textSecondary">Loading searches…</p>
                )}
                {status === 'error' && searches.length === 0 && (
                    <p className="text-textSecondary">Could not load searches.</p>
                )}
                {status === 'ready' && filtered.length === 0 && (
                    <p className="text-textSecondary">No searches in this niche yet. Try searching for something above.</p>
                )}

                <ul className="space-y-3">
                    {filtered.map((search) => (
                        <li key={search.query.toLocaleLowerCase()}>
                            <Link
                                to={`/topic?q=${encodeURIComponent(search.query)}`}
                                className="block bg-surface border border-gray-700 rounded-2xl p-4 hover:border-primary/60 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs uppercase tracking-wide text-primary">{search.niche}</span>
                                            {search.commentCount > 0 && (
                                                <span className="text-xs text-textSecondary">
                                                    {search.commentCount} comment{search.commentCount === 1 ? '' : 's'}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-lg font-semibold text-white truncate">{search.displayQuery}</h2>
                                        {search.rabbitHoleTitle && search.rabbitHoleTitle !== search.displayQuery && (
                                            <p className="text-sm text-textSecondary mt-1 truncate">
                                                Rabbit hole: {search.rabbitHoleTitle}
                                            </p>
                                        )}
                                        {search.displayQuery !== search.query && (
                                            <p className="text-xs text-gray-500 mt-1 truncate">Searched: {search.query}</p>
                                        )}
                                    </div>
                                    <time dateTime={search.searchedAt} className="shrink-0 text-xs text-textSecondary">
                                        {formatRelativeTime(search.searchedAt)}
                                    </time>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}
