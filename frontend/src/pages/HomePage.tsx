import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeLanding } from '../components/HomeLanding';
import { getRecentHoles, getRecentSearches, searchNodes } from '../api/client';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { RabbitHoleSummary, RecentSearch } from '../types';
import { useRabbitHole } from '../hooks/useRabbitHole';

export default function HomePage() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [recentHoles, setRecentHoles] = useState<RabbitHoleSummary[]>([]);
    const [recentLoading, setRecentLoading] = useState(true);
    const [holesLoading, setHolesLoading] = useState(true);
    const navigate = useNavigate();
    const { history, push } = useSearchHistory();
    const { recordVisit } = useRabbitHole();

    const loadRecent = useCallback(async () => {
        setRecentLoading(true);
        try {
            setRecentSearches(await getRecentSearches(12));
        } catch {
            setRecentSearches([]);
        } finally {
            setRecentLoading(false);
        }
    }, []);

    const loadHoles = useCallback(async () => {
        setHolesLoading(true);
        try {
            setRecentHoles(await getRecentHoles(8));
        } catch {
            setRecentHoles([]);
        } finally {
            setHolesLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRecent();
        void loadHoles();
    }, [loadRecent, loadHoles]);

    const onSearch = async (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed || loading) return;
        setLoading(true);
        setError(null);
        try {
            const data = await searchNodes(trimmed);
            push(trimmed);
            if (data.slug && data.primaryNodeId) {
                void recordVisit({
                    nodeId: data.primaryNodeId,
                    slug: data.slug,
                    displayQuery: data.displayQuery || trimmed,
                    source: 'search',
                });
            }
            if (data.slug) {
                navigate(`/q/${encodeURIComponent(data.slug)}?map=1`);
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
                    <p className="mt-3 text-sm text-[#70757a]">
                        Creating shared answer and mind map…
                    </p>
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
                onOpenTopic={(slug, mode = 'discuss') =>
                    navigate(
                        `/q/${encodeURIComponent(slug)}?${mode === 'map' ? 'map=1' : 'discuss=1'}`
                    )
                }
                history={history}
                recentSearches={recentSearches}
                recentLoading={recentLoading}
                recentHoles={recentHoles}
                holesLoading={holesLoading}
            />
        </>
    );
}
