import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { RecentSearchesList } from '../components/RecentSearchesList';
import { getRecentSearches } from '../api/client';
import { RecentSearch } from '../types';

export default function SearchesPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<RecentSearch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setItems(await getRecentSearches(50));
        } catch (err) {
            setItems([]);
            setError(err instanceof Error ? err.message : 'Could not load searches');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const openTopic = (slug: string) => {
        navigate(`/q/${encodeURIComponent(slug)}?discuss=1`);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
            <header className="border-b border-[#ebebeb] bg-white sticky top-0 z-10">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
                    <Logo size="compact" onClick={() => navigate('/')} />
                    <Link to="/" className="text-sm text-[#1a0dab] hover:underline shrink-0">
                        Home
                    </Link>
                </div>
            </header>

            <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-normal text-[#202124] mb-2">Latest searches</h1>
                <p className="text-sm text-[#70757a] mb-6">
                    What people looked up recently on Rabbit Hole. Open any question to read the shared answer and help in
                    the discussion.
                </p>

                {error && (
                    <p className="text-sm text-[#d93025] mb-4 bg-white border border-[#ebebeb] rounded-lg px-4 py-3">
                        {error}
                    </p>
                )}

                <div className="rounded-lg border border-[#ebebeb] overflow-hidden shadow-sm">
                    <RecentSearchesList
                        items={items}
                        loading={loading}
                        onOpenTopic={openTopic}
                    />
                </div>

                {!loading && items.length > 0 && (
                    <p className="text-xs text-[#70757a] mt-4 text-center">
                        Showing the {items.length} most recent searches.
                    </p>
                )}
            </main>
        </div>
    );
}
