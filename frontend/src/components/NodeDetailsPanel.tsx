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
                        onClick={() => setActiveTab(tab as typeof activeTab)}
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
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">
                            Discuss whether this stored answer is right. Everyone searching the same question sees this thread.
                        </p>

                        {commentsLoading && (
                            <p className="text-gray-500 text-sm">Loading comments…</p>
                        )}

                        {commentError && (
                            <p className="text-red-400 text-sm">{commentError}</p>
                        )}

                        <div className="space-y-3">
                            {comments.map((c) => (
                                <div key={c.id} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                                    <div className="text-xs text-gray-500 mb-1">{c.authorName}</div>
                                    <p className="text-gray-200 text-sm whitespace-pre-wrap">{c.text}</p>
                                </div>
                            ))}
                            {!commentsLoading && comments.length === 0 && !commentError && (
                                <p className="text-gray-500 text-sm">No comments yet. Start the discussion.</p>
                            )}
                        </div>

                        <form onSubmit={handlePostComment} className="space-y-2 pt-2 border-t border-gray-700">
                            <input
                                type="text"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                placeholder="Your name (optional)"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                            />
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Is this the right answer?"
                                rows={3}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                            />
                            <button
                                type="submit"
                                disabled={posting || !commentText.trim()}
                                className="bg-primary text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                            >
                                {posting ? 'Posting…' : 'Post comment'}
                            </button>
                        </form>
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
