import React, { useState } from 'react';

interface Props {
    onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: Props) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) onSearch(query);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto p-4 z-10 relative">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="How do I fix..."
                    className="w-full bg-surface border border-gray-700 rounded-full py-3 px-6 text-text focus:outline-none focus:border-primary transition-colors shadow-lg placeholder-gray-500"
                />
                <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white rounded-full p-2 hover:bg-opacity-90 transition-opacity"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
            </div>
        </form>
    );
}
