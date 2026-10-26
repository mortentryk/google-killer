import React from 'react';

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSearch: (query: string) => void;
    variant?: 'hero' | 'compact';
    autoFocus?: boolean;
}

export function SearchBar({
    value,
    onChange,
    onSearch,
    variant = 'hero',
    autoFocus = false,
}: Props) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) onSearch(value.trim());
    };

    const isHero = variant === 'hero';
    const boxClass = isHero
        ? 'h-11 sm:h-[46px] px-12 text-base shadow-sm hover:shadow-md focus-within:shadow-md'
        : 'h-10 px-10 text-sm shadow-none border border-[#dfe1e5]';

    return (
        <form onSubmit={handleSubmit} className={`w-full ${isHero ? 'max-w-[584px]' : 'max-w-[692px]'}`}>
            <div
                className={`relative flex items-center rounded-full bg-white border border-[#dfe1e5] transition-shadow ${boxClass}`}
            >
                <span className="absolute left-4 text-[#9aa0a6] pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </span>
                <input
                    type="text"
                    value={value}
                    autoFocus={autoFocus}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Ask anything — everyone sees the same mind map"
                    className="w-full bg-transparent text-[#202124] placeholder-[#9aa0a6] focus:outline-none rounded-full"
                />
            </div>
        </form>
    );
}
