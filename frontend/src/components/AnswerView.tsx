import React from 'react';
import { Node } from '../types';

interface Props {
    node: Node;
    displayQuery: string;
    slug: string;
    cached?: boolean;
    generated?: boolean;
}

export function AnswerView({ node, displayQuery, slug, cached, generated }: Props) {
    const shareUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/q/${slug}` : `/q/${slug}`;

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <p className="text-xs text-[#70757a] mb-1">
                Shared AI answer
                {cached ? ' · saved for everyone' : generated ? ' · generated once' : ''}
            </p>
            <h1 className="text-2xl text-[#202124] font-normal mb-2">{node.title}</h1>
            <p className="text-sm text-[#70757a] mb-4">
                People who search for “{displayQuery}” get this same result.
            </p>

            <div className="text-[#4d5156] text-sm leading-relaxed mb-6">{node.aiSummary}</div>

            {node.steps?.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-base text-[#202124] font-medium mb-2">Steps</h2>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-[#4d5156]">
                        {node.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ol>
                </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-[#70757a] mb-8">
                <span className="bg-[#f8f9fa] border border-[#ebebeb] rounded px-2 py-1">
                    Difficulty {node.difficulty}/5
                </span>
                {node.timeEstimate && (
                    <span className="bg-[#f8f9fa] border border-[#ebebeb] rounded px-2 py-1">
                        {node.timeEstimate}
                    </span>
                )}
                {node.costEstimate && (
                    <span className="bg-[#f8f9fa] border border-[#ebebeb] rounded px-2 py-1">
                        {node.costEstimate}
                    </span>
                )}
            </div>

            <div className="border border-[#ebebeb] rounded-lg p-3 bg-white text-sm">
                <div className="text-[#70757a] text-xs mb-1">Share this answer</div>
                <code className="text-[#1a0dab] break-all">{shareUrl}</code>
            </div>
        </div>
    );
}
