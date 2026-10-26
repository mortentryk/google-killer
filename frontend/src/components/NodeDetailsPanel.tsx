import React, { useState } from 'react';
import { Node } from '../types';

interface Props {
    node: Node;
    onClose: () => void;
    onFollowTrail?: (query: string) => void;
}

export function NodeDetailsPanel({ node, onClose, onFollowTrail }: Props) {
    const [activeTab, setActiveTab] = useState<'Answer' | 'Tools'>('Answer');

    return (
        <div className="fixed right-0 bottom-0 md:top-[113px] md:bottom-0 h-[42vh] md:h-[calc(100%-113px)] w-full md:w-[400px] max-w-full bg-white border-t md:border-t-0 md:border-l border-[#ebebeb] shadow-lg z-40 flex flex-col rounded-t-xl md:rounded-none">
            <div className="p-4 border-b border-[#ebebeb] flex justify-between items-start gap-2">
                <div>
                    <p className="text-xs text-[#70757a] uppercase tracking-wide">Map node</p>
                    <h2 className="text-lg font-normal text-[#1a0dab] leading-snug">{node.title}</h2>
                </div>
                <button onClick={onClose} className="text-[#70757a] hover:text-[#202124] p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex gap-1 px-4 pt-2 border-b border-[#ebebeb] text-sm">
                {(['Answer', 'Tools'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 pb-2 border-b-2 -mb-px ${
                            activeTab === tab
                                ? 'border-[#1a73e8] text-[#1a73e8] font-medium'
                                : 'border-transparent text-[#70757a] hover:text-[#202124]'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {onFollowTrail && (
                <div className="px-4 py-3 border-b border-[#ebebeb] bg-[#f8f9fa]">
                    <button
                        type="button"
                        onClick={() => onFollowTrail(node.title)}
                        className="w-full text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#1765cc] rounded-md py-2.5 px-4 shadow-sm"
                    >
                        Follow this trail →
                    </button>
                    <p className="text-xs text-[#70757a] mt-2 text-center">
                        Open this as its own question and keep going down the hole.
                    </p>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-5">
                {activeTab === 'Answer' && (
                    <div className="space-y-5 text-sm text-[#4d5156] leading-relaxed">
                        <p>{node.aiSummary}</p>

                        {node.steps?.length > 0 && (
                            <div>
                                <h3 className="text-[#202124] font-medium mb-2">Steps</h3>
                                <ol className="space-y-2 list-decimal list-inside">
                                    {node.steps.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-[#f8f9fa] rounded p-2 border border-[#ebebeb]">
                                <div className="text-[#70757a]">Difficulty</div>
                                <div className="text-[#202124] font-medium">{node.difficulty}/5</div>
                            </div>
                            <div className="bg-[#f8f9fa] rounded p-2 border border-[#ebebeb]">
                                <div className="text-[#70757a]">Time</div>
                                <div className="text-[#202124] font-medium">{node.timeEstimate || '—'}</div>
                            </div>
                            <div className="bg-[#f8f9fa] rounded p-2 border border-[#ebebeb]">
                                <div className="text-[#70757a]">Cost</div>
                                <div className="text-[#202124] font-medium">{node.costEstimate || '—'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Tools' && (
                    <div className="space-y-4 text-sm text-[#4d5156]">
                        <div>
                            <h3 className="text-[#202124] font-medium mb-2">Tools</h3>
                            <ul className="list-disc list-inside">
                                {node.tools?.map((tool, i) => <li key={i}>{tool}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-[#202124] font-medium mb-2">Materials</h3>
                            <ul className="list-disc list-inside">
                                {node.materials?.map((mat, i) => <li key={i}>{mat}</li>)}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
