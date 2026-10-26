import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeLanding } from '../components/HomeLanding';
import { searchNodes } from '../api/client';
import { useSearchHistory } from '../hooks/useSearchHistory';

export default function HomePage() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { history, push } = useSearchHistory();

    const onSearch = async (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed || loading) return;
        setLoading(true);
        setError(null);
        try {
            const data = await searchNodes(trimmed);
            push(trimmed);
            if (data.slug) {
                navigate(`/q/${data.slug}`);
            } else {
                setError('Missing topic link from server');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && (
                <div className="fixed inset-0 z-50 bg-white/80 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                    <p className="mt-3 text-sm text-[#70757a]">Finding or creating the shared answer…</p>
                </div>
            )}
            {error && (
                <p className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-sm text-[#d93025] bg-white px-4 py-2 border border-[#ebebeb] rounded shadow-sm">
                    {error}
                </p>
            )}
            <HomeLanding
                query={query}
                onQueryChange={setQuery}
                onSearch={onSearch}
                history={history}
            />
        </>
    );
}
