import React from 'react';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';

interface Props {
    query: string;
    onQueryChange: (q: string) => void;
    onSearch: (q: string) => void;
    onHome: () => void;
    resultCount: number;
    cached?: boolean;
}

export function ResultsHeader({
    query,
    onQueryChange,
    onSearch,
    onHome,
    resultCount,
    cached,
}: Props) {
    return (
        <header className="border-b border-[#ebebeb] bg-white sticky top-0 z-30">
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
            <div className="flex items-center gap-6 px-4 sm:px-6 pb-0 max-w-[1400px] mx-auto text-sm text-[#70757a] border-b border-transparent">
                <span className="text-[#1a73e8] border-b-[3px] border-[#1a73e8] pb-3 font-medium">
                    Mind map
                </span>
                <span className="pb-3 hover:text-[#202124] cursor-default">Answer</span>
                <span className="pb-3 hover:text-[#202124] cursor-default">Discussion</span>
                <span className="ml-auto pb-3 text-xs hidden sm:inline">
                    {resultCount > 0 ? `About ${resultCount} nodes` : 'No results'}
                    {cached ? ' · stored result' : ''}
                </span>
            </div>
        </header>
    );
}
