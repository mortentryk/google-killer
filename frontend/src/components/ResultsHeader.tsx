import React from 'react';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { ResultView } from '../types';

interface Props {
    query: string;
    onQueryChange: (q: string) => void;
    onSearch: (q: string) => void;
    onHome: () => void;
    activeView: ResultView;
    onViewChange: (view: ResultView) => void;
    resultCount: number;
    cached?: boolean;
}

const TABS: { id: ResultView; label: string }[] = [
    { id: 'answer', label: 'Answer' },
    { id: 'map', label: 'Mind map' },
    { id: 'discussion', label: 'Discussion' },
];

export function ResultsHeader({
    query,
    onQueryChange,
    onSearch,
    onHome,
    activeView,
    onViewChange,
    resultCount,
    cached,
}: Props) {
    return (
        <header className="border-b border-[#ebebeb] bg-white sticky top-0 z-30 shrink-0">
            <div className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-3 max-w-[1400px] mx-auto">
                <Logo size="compact" onClick={onHome} />
                <div className="flex-1 min-w-0">
                    <SearchBar
                        value={query}
                        onChange={onQueryChange}
                        onSearch={onSearch}
                        variant="compact"
                    />
                </div>
            </div>
            <div className="flex items-center gap-6 px-4 sm:px-6 pb-0 max-w-[1400px] mx-auto text-sm text-[#70757a]">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onViewChange(tab.id)}
                        className={`pb-3 border-b-[3px] -mb-px transition-colors ${
                            activeView === tab.id
                                ? 'border-[#1a73e8] text-[#1a73e8] font-medium'
                                : 'border-transparent hover:text-[#202124]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
                <span className="ml-auto pb-3 text-xs hidden sm:inline">
                    {resultCount > 0 ? `About ${resultCount} nodes` : 'No results'}
                    {cached ? ' · stored' : ''}
                </span>
            </div>
        </header>
    );
}
