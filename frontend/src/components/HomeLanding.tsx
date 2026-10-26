import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { RecentSearchesList } from './RecentSearchesList';
import { RecentSearch } from '../types';

const SAMPLES = [
    'fix leaking radiator',
    'how to bleed a radiator',
    'plumbing basics',
    'when to call a plumber',
    'home heating not working',
];

const HOME_PREVIEW_COUNT = 5;

interface Props {
    query: string;
    onQueryChange: (q: string) => void;
    onSearch: (q: string) => void;
    onOpenTopic: (slug: string) => void;
    history: string[];
    recentSearches: RecentSearch[];
    recentLoading?: boolean;
}

export function HomeLanding({
    query,
    onQueryChange,
    onSearch,
    onOpenTopic,
    history,
    recentSearches,
    recentLoading,
}: Props) {
    const lucky = () => {
        const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
        onQueryChange(pick);
        onSearch(pick);
    };

    const preview = recentSearches.slice(0, HOME_PREVIEW_COUNT);
    const hasMore = recentSearches.length > HOME_PREVIEW_COUNT;

    return (
        <div className="min-h-screen flex flex-col bg-white text-[#202124]">
            <header className="flex justify-end gap-4 px-5 py-4 text-sm text-[#202124]">
                <Link to="/searches" className="hover:underline text-[#1a0dab]">
                    Latest searches
                </Link>
                <span className="hover:underline cursor-default text-[#70757a]">Side trails</span>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16 -mt-12">
                <div className="mb-3">
                    <Logo size="hero" />
                </div>
                <p className="text-[#70757a] text-sm sm:text-base mb-8 max-w-md text-center">
                    Start with one question. Follow the map until you land somewhere else.
                </p>

                <SearchBar
                    value={query}
                    onChange={onQueryChange}
                    onSearch={onSearch}
                    variant="hero"
                    autoFocus
                />

                <div className="flex flex-wrap justify-center gap-3 mt-7">
                    <button
                        type="button"
                        onClick={() => query.trim() && onSearch(query.trim())}
                        className="bg-[#f8f9fa] border border-transparent hover:border-[#dadce0] hover:shadow-sm text-sm text-[#3c4043] px-5 py-2 rounded-sm"
                    >
                        Go down the hole
                    </button>
                    <button
                        type="button"
                        onClick={lucky}
                        className="bg-[#f8f9fa] border border-transparent hover:border-[#dadce0] hover:shadow-sm text-sm text-[#3c4043] px-5 py-2 rounded-sm"
                    >
                        Surprise me
                    </button>
                </div>

                {(preview.length > 0 || recentLoading) && (
                    <div className="mt-12 w-full max-w-lg">
                        <div className="flex items-end justify-between gap-2 mb-3">
                            <div className="text-left">
                                <p className="text-xs text-[#70757a] uppercase tracking-wide">Latest searches</p>
                                <p className="text-xs text-[#70757a] mt-1">Tap to help in the discussion</p>
                            </div>
                            <Link to="/searches" className="text-sm text-[#1a0dab] hover:underline shrink-0">
                                See all
                            </Link>
                        </div>
                        <div className="rounded-lg border border-[#ebebeb] bg-[#f8f9fa] overflow-hidden">
                            <RecentSearchesList
                                items={preview}
                                loading={recentLoading}
                                onOpenTopic={onOpenTopic}
                            />
                        </div>
                        {hasMore && (
                            <p className="text-center mt-3">
                                <Link to="/searches" className="text-sm text-[#1a0dab] hover:underline">
                                    View all recent searches →
                                </Link>
                            </p>
                        )}
                    </div>
                )}

                {history.length > 0 && (
                    <div className="mt-8 w-full max-w-lg text-center">
                        <p className="text-xs text-[#70757a] uppercase tracking-wide mb-3">Your recent searches</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {history.slice(0, 6).map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => {
                                        onQueryChange(item);
                                        onSearch(item);
                                    }}
                                    className="text-sm text-[#1a0dab] hover:underline px-2 py-1"
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {history.length === 0 && (
                    <div className="mt-8 w-full max-w-lg text-center">
                        <p className="text-xs text-[#70757a] uppercase tracking-wide mb-3">Try a search</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {SAMPLES.slice(0, 5).map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => {
                                        onQueryChange(item);
                                        onSearch(item);
                                    }}
                                    className="text-sm text-[#1a0dab] hover:underline px-2 py-1"
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <footer className="text-center text-xs text-[#70757a] pb-6">
                One shared answer per question · branch off on the mind map
            </footer>
        </div>
    );
}
