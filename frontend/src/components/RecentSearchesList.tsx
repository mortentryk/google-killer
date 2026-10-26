import React from 'react';
import { RecentSearch } from '../types';
import { formatRelativeTime } from '../utils/formatRelativeTime';

interface Props {
    items: RecentSearch[];
    loading?: boolean;
    emptyMessage?: string;
    onOpenTopic: (slug: string) => void;
}

export function RecentSearchesList({
    items,
    loading,
    emptyMessage = 'No searches yet — be the first to go down the hole.',
    onOpenTopic,
}: Props) {
    if (loading && items.length === 0) {
        return <p className="text-sm text-[#70757a] py-6 text-center">Loading what people searched…</p>;
    }

    if (!loading && items.length === 0) {
        return <p className="text-sm text-[#70757a] py-6 px-4 text-center">{emptyMessage}</p>;
    }

    return (
        <ul className="divide-y divide-[#ebebeb] bg-white">
            {items.map((item) => (
                <li key={item.id}>
                    <button
                        type="button"
                        onClick={() => onOpenTopic(item.slug)}
                        className="w-full text-left px-4 py-3 hover:bg-[#f1f3f4] group sm:px-5 sm:py-4"
                    >
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm sm:text-base text-[#1a0dab] group-hover:underline truncate">
                                {item.displayQuery}
                            </span>
                            <span className="text-xs text-[#70757a] shrink-0">{formatRelativeTime(item.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[#70757a] mt-1 group-hover:text-[#1a73e8]">
                            {(item.commentCount ?? 0) === 0
                                ? 'No comments yet — be the first to help'
                                : `${item.commentCount} comment${item.commentCount === 1 ? '' : 's'} · join the discussion`}
                        </p>
                    </button>
                </li>
            ))}
        </ul>
    );
}
