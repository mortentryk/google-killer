import React, { useState } from 'react';
import { Node } from '../types';

interface Props {
    node: Node;
    onClose: () => void;
}

export function NodeDetailsPanel({ node, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<'Answer' | 'Comments' | 'Videos' | 'Tools'>('Answer');

    return (
        <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-surface border-l border-gray-700 shadow-2xl z-50 flex flex-col animate-slide-in">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">{node.title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex gap-2 p-4 overflow-x-auto border-b border-gray-700">
                {['Answer', 'Comments', 'Videos', 'Tools'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
                                ? 'bg-primary text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'Answer' && (
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                            <h3 className="text-sm font-semibold text-primary mb-2">AI SUMMARY</h3>
                            <p className="text-gray-300 leading-relaxed">{node.aiSummary}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Steps</h3>
                            <ol className="space-y-3">
                                {node.steps?.map((step, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                                            {i + 1}
                                        </span>
                                        <span className="text-gray-300">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gray-800 p-3 rounded-lg text-center">
                                <div className="text-xs text-gray-500 uppercase">Difficulty</div>
                                <div className="text-white font-bold">{node.difficulty}/5</div>
                            </div>
                            <div className="bg-gray-800 p-3 rounded-lg text-center">
                                <div className="text-xs text-gray-500 uppercase">Time</div>
                                <div className="text-white font-bold">{node.timeEstimate}</div>
                            </div>
                            <div className="bg-gray-800 p-3 rounded-lg text-center">
                                <div className="text-xs text-gray-500 uppercase">Cost</div>
                                <div className="text-white font-bold">{node.costEstimate}</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Tools' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Tools Required</h3>
                        <ul className="list-disc list-inside text-gray-300">
                            {node.tools?.map((tool, i) => <li key={i}>{tool}</li>)}
                        </ul>
                        <h3 className="text-lg font-semibold text-white mt-6">Materials</h3>
                        <ul className="list-disc list-inside text-gray-300">
                            {node.materials?.map((mat, i) => <li key={i}>{mat}</li>)}
                        </ul>
                    </div>
                )}

                {activeTab === 'Comments' && (
                    <div className="text-center text-gray-500 py-10">
                        No comments yet.
                    </div>
                )}

                {activeTab === 'Videos' && (
                    <div className="text-center text-gray-500 py-10">
                        No videos available.
                    </div>
                )}
            </div>
        </div>
    );
}
