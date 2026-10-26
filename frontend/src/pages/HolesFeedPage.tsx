import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { getRecentHoles } from '../api/client';
import { RabbitHoleSummary } from '../types';
import { formatRelativeTime } from '../utils/formatRelativeTime';

export default function HolesFeedPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<RabbitHoleSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setItems(await getRecentHoles(50));
        } catch (err) {
            setItems([]);
            setError(err instanceof Error ? err.message : 'Could not load stories');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
            <header className="border-b border-[#ebebeb] bg-white sticky top-0 z-10">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
                    <Logo size="compact" onClick={() => navigate('/')} />
                    <div className="flex gap-4 text-sm shrink-0">
                        <Link to="/searches" className="text-[#1a0dab] hover:underline">
                            Questions
                        </Link>
                        <Link to="/" className="text-[#1a0dab] hover:underline">
                            Home
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-normal mb-2">Rabbit hole stories</h1>
                <p className="text-sm text-[#70757a] mb-6">
                    Paths people took across questions (2+ stops). One topic per question — stories stay linear so
                    nothing turns into a messy graph.
                </p>

                {error && (
                    <p className="text-sm text-[#d93025] mb-4 bg-white border border-[#ebebeb] rounded-lg px-4 py-3">
                        {error}
                    </p>
                )}

                <div className="rounded-lg border border-[#ebebeb] overflow-hidden shadow-sm bg-white">
                    {loading && items.length === 0 && (
                        <p className="text-sm text-[#70757a] py-8 text-center">Loading stories…</p>
                    )}
                    {!loading && items.length === 0 && !error && (
                        <p className="text-sm text-[#70757a] py-8 px-4 text-center">
                            No shared trails yet. Search something, follow a branch on the map, then use Share story.
                        </p>
                    )}
                    {items.length > 0 && (
                        <ul className="divide-y divide-[#ebebeb]">
                            {items.map((hole) => (
                                <li key={hole.id}>
                                    <Link
                                        to={`/holes/${hole.id}`}
                                        className="block px-4 sm:px-5 py-4 hover:bg-[#f1f3f4] group"
                                    >
                                        <p className="text-sm sm:text-base text-[#1a0dab] group-hover:underline leading-snug">
                                            {hole.firstQuery === hole.lastQuery
                                                ? hole.firstQuery
                                                : `${hole.firstQuery} → ${hole.lastQuery}`}
                                        </p>
                                        <p className="text-xs text-[#70757a] mt-1.5">
                                            {hole.stepCount} stops · updated {formatRelativeTime(hole.updatedAt)}
                                        </p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>
        </div>
    );
}
