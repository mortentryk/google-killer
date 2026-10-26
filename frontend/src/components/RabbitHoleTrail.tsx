import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRabbitHole } from '../hooks/useRabbitHole';

export function RabbitHoleTrail() {
    const { steps, sharePath, startNewHole } = useRabbitHole();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    if (steps.length === 0) {
        return null;
    }

    const onShare = async () => {
        if (!sharePath) return;
        const url = `${window.location.origin}${sharePath}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt('Copy this rabbit hole link:', url);
        }
    };

    return (
        <div className="border-b border-[#ebebeb] bg-[#f8f9fa] shrink-0">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium uppercase tracking-wide text-[#70757a]">Your hole</span>
                    {sharePath && (
                        <button
                            type="button"
                            onClick={() => void onShare()}
                            className="text-xs text-[#1a73e8] hover:underline"
                        >
                            {copied ? 'Link copied!' : 'Share story'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => void startNewHole()}
                        className="text-xs text-[#70757a] hover:text-[#202124] hover:underline"
                    >
                        New hole
                    </button>
                    {sharePath && (
                        <Link to={sharePath} className="text-xs text-[#1a0dab] hover:underline hidden sm:inline">
                            View story
                        </Link>
                    )}
                </div>
                <ol className="flex flex-wrap items-center gap-1 min-w-0 text-sm list-none m-0 p-0">
                    {steps.map((step, index) => (
                        <li key={step.id} className="flex items-center gap-1 min-w-0 max-w-full">
                            {index > 0 && <span className="text-[#dadce0] shrink-0">→</span>}
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(`/q/${encodeURIComponent(step.slug)}`, { state: { skipRecord: true } })
                                }
                                className="text-[#1a0dab] hover:underline truncate max-w-[10rem] sm:max-w-[14rem]"
                                title={step.displayQuery}
                            >
                                {step.displayQuery}
                            </button>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}
