import React, { useEffect, useMemo, useState } from 'react';
import { GraphData, Node } from '../types';
import { buildApproachChain, getFallbackExploreChoices, getNextBranchChoices } from '../utils/rabbitPath';

interface Props {
    data: GraphData;
    displayQuery: string;
    onFollowBranch: (node: Node) => void;
    onOpenNewTopic: (query: string) => void;
    onShowAnswer?: () => void;
}

export function RabbitHoleWalkView({
    data,
    displayQuery,
    onFollowBranch,
    onOpenNewTopic,
    onShowAnswer,
}: Props) {
    const approachChain = useMemo(() => buildApproachChain(data), [data]);
    const [extraSteps, setExtraSteps] = useState<Node[]>([]);
    const [stepIndex, setStepIndex] = useState(0);

    const path = useMemo(() => [...approachChain, ...extraSteps], [approachChain, extraSteps]);
    const current = path[stepIndex] ?? path[path.length - 1];
    const finishedApproach = stepIndex >= approachChain.length - 1;
    const atPrimary = current?.id === data.primaryNodeId && finishedApproach;
    const atEndOfPath = stepIndex === path.length - 1;
    const visitedIds = useMemo(() => new Set(path.map((n) => n.id)), [path]);

    useEffect(() => {
        setExtraSteps([]);
        setStepIndex(0);
    }, [data.slug, data.primaryNodeId]);

    const nextChoices = useMemo(() => {
        if (!current || !finishedApproach || !atEndOfPath) return [];
        const branch = getNextBranchChoices(current.id, data, visitedIds);
        if (branch.length > 0) return branch;
        return getFallbackExploreChoices(current.id, data);
    }, [current, finishedApproach, atEndOfPath, data]);

    const goDeeper = () => {
        if (stepIndex < approachChain.length - 1) {
            setStepIndex((i) => i + 1);
        }
    };

    const pickBranch = (node: Node) => {
        onFollowBranch(node);
        const existingIndex = path.findIndex((n) => n.id === node.id);
        if (existingIndex >= 0) {
            setStepIndex(existingIndex);
            return;
        }
        setExtraSteps((prev) => {
            const next = [...prev, node];
            setStepIndex(approachChain.length + next.length - 1);
            return next;
        });
    };

    if (!current) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-[#70757a]">
                No path for this topic yet.
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-[#f8f9fa]">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                <p className="text-xs uppercase tracking-wide text-[#70757a] mb-2">Follow the rabbit hole</p>
                <h2 className="text-xl font-normal text-[#202124] mb-1">{displayQuery}</h2>
                <p className="text-sm text-[#70757a] mb-8">Walk the map from the big picture down to the answer, then pick what to explore next.</p>

                <nav aria-label="Path" className="mb-8 overflow-x-auto">
                    <ol className="flex items-center gap-1 min-w-min pb-1">
                        {path.map((node, index) => (
                            <li key={node.id} className="flex items-center gap-1 shrink-0">
                                {index > 0 && <span className="text-[#dadce0]">→</span>}
                                <button
                                    type="button"
                                    onClick={() => setStepIndex(index)}
                                    className={`text-xs sm:text-sm px-2.5 py-1 rounded-full border ${
                                        index === stepIndex
                                            ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                                            : index < stepIndex
                                              ? 'bg-white text-[#1a0dab] border-[#dadce0] hover:underline'
                                              : 'bg-[#f1f3f4] text-[#70757a] border-transparent'
                                    }`}
                                >
                                    {node.title}
                                </button>
                            </li>
                        ))}
                    </ol>
                </nav>

                <article className="bg-white border border-[#ebebeb] rounded-xl shadow-sm p-5 sm:p-6 mb-6">
                    <p className="text-xs text-[#70757a] uppercase tracking-wide mb-2">
                        Step {stepIndex + 1} of {path.length}
                        {stepIndex < approachChain.length - 1 ? ' · going deeper' : atPrimary ? ' · your answer' : ' · side trail'}
                    </p>
                    <h3 className="text-2xl font-normal text-[#202124] mb-3">{current.title}</h3>
                    <p className="text-sm text-[#4d5156] leading-relaxed">{current.aiSummary}</p>

                    {current.steps?.length > 0 && atPrimary && stepIndex === path.length - 1 && (
                        <ol className="mt-4 list-decimal list-inside text-sm text-[#4d5156] space-y-1">
                            {current.steps.slice(0, 4).map((step, i) => (
                                <li key={i}>{step}</li>
                            ))}
                        </ol>
                    )}

                    {stepIndex < approachChain.length - 1 && (
                        <button
                            type="button"
                            onClick={goDeeper}
                            className="mt-6 w-full sm:w-auto text-sm font-medium bg-[#1a73e8] text-white px-5 py-2.5 rounded-md hover:bg-[#1765cc]"
                        >
                            Continue deeper →
                        </button>
                    )}

                    {approachChain.length === 1 && atPrimary && onShowAnswer && (
                        <button
                            type="button"
                            onClick={onShowAnswer}
                            className="mt-6 w-full sm:w-auto text-sm font-medium border border-[#dadce0] bg-white text-[#1a73e8] px-5 py-2.5 rounded-md hover:bg-[#f1f8ff]"
                        >
                            Open full answer & discussion →
                        </button>
                    )}
                </article>

                {finishedApproach && atEndOfPath && nextChoices.length > 0 && (
                    <section>
                        <h4 className="text-sm font-medium text-[#202124] mb-3">What comes next?</h4>
                        <p className="text-xs text-[#70757a] mb-3">Step to another part of this map, or open a new shared question.</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {nextChoices.map((node) => (
                                <button
                                    key={node.id}
                                    type="button"
                                    onClick={() => pickBranch(node)}
                                    className="text-left bg-white border border-[#ebebeb] hover:border-[#1a73e8] hover:shadow-sm rounded-lg p-4 transition-colors"
                                >
                                    <p className="text-[#1a0dab] font-medium">{node.title}</p>
                                    <p className="text-xs text-[#70757a] mt-1 line-clamp-2">{node.aiSummary}</p>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-[#70757a] mt-3">
                            Or{' '}
                            {nextChoices.map((node, i) => (
                                <React.Fragment key={`${node.id}-open`}>
                                    {i > 0 && ', '}
                                    <button
                                        type="button"
                                        onClick={() => onOpenNewTopic(node.title)}
                                        className="text-[#1a0dab] hover:underline"
                                    >
                                        open {node.title} as a new question
                                    </button>
                                </React.Fragment>
                            ))}
                        </p>
                    </section>
                )}

                {finishedApproach && atEndOfPath && nextChoices.length === 0 && (
                    <p className="text-sm text-[#70757a]">
                        You reached the end of this branch. Search from the bar above to start another hole.
                    </p>
                )}
            </div>
        </div>
    );
}
