import React from 'react';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';

const SAMPLES = [
    'fix leaking radiator',
    'how to bleed a radiator',
    'plumbing basics',
    'when to call a plumber',
    'home heating not working',
];

interface Props {
    query: string;
    onQueryChange: (q: string) => void;
    onSearch: (q: string) => void;
    history: string[];
}

export function HomeLanding({ query, onQueryChange, onSearch, history }: Props) {
    const lucky = () => {
        const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
        onQueryChange(pick);
        onSearch(pick);
    };

    return (
        <div className="min-h-screen flex flex-col bg-white text-[#202124]">
            <header className="flex justify-end gap-4 px-5 py-4 text-sm text-[#202124]">
                <span className="hover:underline cursor-default">Shared answers</span>
                <span className="hover:underline cursor-default">Side trails</span>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-4 pb-32 -mt-16">
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

                {(history.length > 0 || SAMPLES.length > 0) && (
                    <div className="mt-12 w-full max-w-xl text-center">
                        <p className="text-xs text-[#70757a] uppercase tracking-wide mb-3">Try a search</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {(history.length > 0 ? history : SAMPLES).slice(0, 6).map((item) => (
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
