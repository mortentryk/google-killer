import React from 'react';
import { Link } from 'react-router-dom';
import { RabbitHoleSummary } from '../types';
import { formatRelativeTime } from '../utils/formatRelativeTime';

interface Props {
    items: RabbitHoleSummary[];
    loading?: boolean;
}

export function RecentHolesList({ items, loading }: Props) {
    if (loading && items.length === 0) {
        return <p className="text-sm text-[#70757a] py-4 text-center">Loading trails…</p>;
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <ul className="divide-y divide-[#ebebeb] bg-white">
            {items.map((hole) => (
                <li key={hole.id}>
                    <Link
                        to={`/holes/${hole.id}`}
                        className="block px-4 py-3 hover:bg-[#f1f3f4] group sm:px-5 sm:py-3.5"
                    >
                        <p className="text-sm text-[#1a0dab] group-hover:underline truncate">
                            {hole.firstQuery === hole.lastQuery
                                ? hole.firstQuery
                                : `${hole.firstQuery} → ${hole.lastQuery}`}
                        </p>
                        <p className="text-xs text-[#70757a] mt-1">
                            {hole.stepCount} stops · {formatRelativeTime(hole.updatedAt)}
                        </p>
                    </Link>
                </li>
            ))}
        </ul>
    );
}
