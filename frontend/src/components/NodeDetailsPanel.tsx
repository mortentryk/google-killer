import React, { useEffect, useState } from 'react';
import { Node, Comment } from '../types';
import { getComments, postComment } from '../api/client';

interface Props {
    node: Node;
    onClose: () => void;
}

export function NodeDetailsPanel({ node, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<'Answer' | 'Comments' | 'Videos' | 'Tools'>('Answer');
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [posting, setPosting] = useState(false);
    const [commentError, setCommentError] = useState<string | null>(null);

    useEffect(() => {
        if (activeTab !== 'Comments') return;

        let cancelled = false;
        setCommentsLoading(true);
        setCommentError(null);
        getComments(node.id)
            .then((data) => {
                if (!cancelled) setComments(data);
            })
            .catch((e) => {
                if (!cancelled) {
                    setCommentError(e instanceof Error ? e.message : 'Could not load comments');
                }
            })
            .finally(() => {
                if (!cancelled) setCommentsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [activeTab, node.id]);

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        setPosting(true);
        setCommentError(null);
        try {
            const created = await postComment(node.id, commentText, authorName || undefined);
            setComments((prev) => [...prev, created]);
            setCommentText('');
        } catch (err) {
            setCommentError(err instanceof Error ? err.message : 'Could not post comment');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="fixed right-0 bottom-0 md:top-[113px] md:bottom-0 h-[42vh] md:h-[calc(100%-113px)] w-full md:w-[400px] max-w-full bg-white border-t md:border-t-0 md:border-l border-[#ebebeb] shadow-lg z-40 flex flex-col rounded-t-xl md:rounded-none">
            <div className="p-4 border-b border-[#ebebeb] flex justify-between items-start gap-2">
                <div>
                    <p className="text-xs text-[#70757a] uppercase tracking-wide">Featured result</p>
                    <h2 className="text-lg font-normal text-[#1a0dab] leading-snug">{node.title}</h2>
                </div>
                <button onClick={onClose} className="text-[#70757a] hover:text-[#202124] p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex gap-1 px-4 pt-2 border-b border-[#ebebeb] text-sm">
                {(['Answer', 'Comments', 'Tools'] as const).map((tab) => (
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

                {activeTab === 'Comments' && (
                    <div className="space-y-4 text-sm">
                        <p className="text-[#70757a]">
                            Discuss whether this stored answer is right. Same question, same thread.
                        </p>

                        {commentsLoading && <p className="text-[#70757a]">Loading…</p>}
                        {commentError && <p className="text-[#d93025]">{commentError}</p>}

                        <div className="space-y-3">
                            {comments.map((c) => (
                                <div key={c.id} className="border border-[#ebebeb] rounded-lg p-3 bg-[#f8f9fa]">
                                    <div className="text-xs text-[#70757a] mb-1">{c.authorName}</div>
                                    <p className="text-[#202124] whitespace-pre-wrap">{c.text}</p>
                                </div>
                            ))}
                            {!commentsLoading && comments.length === 0 && !commentError && (
                                <p className="text-[#70757a]">No comments yet.</p>
                            )}
                        </div>

                        <form onSubmit={handlePostComment} className="space-y-2 pt-2 border-t border-[#ebebeb]">
                            <input
                                type="text"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                placeholder="Your name (optional)"
                                className="w-full border border-[#dfe1e5] rounded px-3 py-2 text-sm"
                            />
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Is this the right answer?"
                                rows={3}
                                className="w-full border border-[#dfe1e5] rounded px-3 py-2 text-sm"
                            />
                            <button
                                type="submit"
                                disabled={posting || !commentText.trim()}
                                className="bg-[#f8f9fa] border border-[#dadce0] hover:border-[#d2e3fc] hover:bg-[#f1f8ff] text-[#1a73e8] text-sm px-4 py-2 rounded disabled:opacity-50"
                            >
                                {posting ? 'Posting…' : 'Post'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
