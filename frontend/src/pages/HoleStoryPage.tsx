import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { getJourney } from '../api/client';
import { RabbitHoleStory } from '../types';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { compactTrailSteps } from '../utils/trailRules';

export default function HoleStoryPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [story, setStory] = useState<RabbitHoleStory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        setError(null);
        getJourney(id)
            .then(setStory)
            .catch((e) => {
                setStory(null);
                setError(e instanceof Error ? e.message : 'Not found');
            })
            .finally(() => setLoading(false));
    }, [id]);

    const trail = story ? compactTrailSteps(story.steps) : [];
    const first = trail[0];
    const last = trail[trail.length - 1];

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#202124]">
            <header className="border-b border-[#ebebeb] bg-white">
                <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
                    <Logo size="compact" onClick={() => navigate('/')} />
                    <Link to="/" className="text-sm text-[#1a0dab] hover:underline">
                        Home
                    </Link>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                <p className="text-xs uppercase tracking-wide text-[#70757a] mb-2">Rabbit hole story</p>
                <h1 className="text-2xl font-normal mb-2">
                    {first && last && first.slug !== last.slug
                        ? `From “${first.displayQuery}” to “${last.displayQuery}”`
                        : first
                          ? first.displayQuery
                          : 'Someone’s rabbit hole'}
                </h1>
                {story && (
                    <p className="text-sm text-[#70757a] mb-6">
                        {trail.length} stop{trail.length === 1 ? '' : 's'} · started{' '}
                        {formatRelativeTime(story.startedAt)}
                    </p>
                )}

                {loading && <p className="text-sm text-[#70757a]">Loading story…</p>}
                {error && (
                    <p className="text-sm text-[#d93025] bg-white border border-[#ebebeb] rounded-lg px-4 py-3">
                        {error}
                    </p>
                )}

                {story && trail.length > 0 && (
                    <ol className="space-y-0 rounded-lg border border-[#ebebeb] bg-white overflow-hidden shadow-sm">
                        {trail.map((step, index) => (
                            <li key={step.id} className="border-b border-[#ebebeb] last:border-b-0">
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(`/q/${encodeURIComponent(step.slug)}`, { state: { skipRecord: true } })
                                    }
                                    className="w-full text-left px-4 sm:px-5 py-4 hover:bg-[#f1f3f4] group"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-xs font-medium text-[#1a73e8]">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-base text-[#1a0dab] group-hover:underline">
                                                {step.displayQuery}
                                            </p>
                                            {step.nodeTitle && step.nodeTitle.toLowerCase() !== step.displayQuery.toLowerCase() && (
                                                <p className="text-xs text-[#70757a] mt-1">Answer: {step.nodeTitle}</p>
                                            )}
                                            <p className="text-xs text-[#70757a] mt-1 capitalize">
                                                {step.source === 'trail' ? 'Followed a trail' : 'Search'} ·{' '}
                                                {formatRelativeTime(step.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ol>
                )}

                {story && trail.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() =>
                                navigate(`/q/${encodeURIComponent(trail[0].slug)}`, { state: { skipRecord: true } })
                            }
                            className="text-sm bg-[#1a73e8] text-white px-4 py-2 rounded-md hover:bg-[#1765cc]"
                        >
                            Walk this hole
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    `/q/${encodeURIComponent(trail[trail.length - 1].slug)}?discuss=1`,
                                    { state: { skipRecord: true } }
                                )
                            }
                            className="text-sm border border-[#dadce0] bg-white px-4 py-2 rounded-md hover:bg-[#f8f9fa]"
                        >
                            Jump to the end & discuss
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
