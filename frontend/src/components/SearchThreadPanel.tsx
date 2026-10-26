import React, { useEffect, useRef, useState } from 'react';
import { getSearchThread, postSearchComment } from '../api/client';
import { AiAnswer, Node, SearchComment, SearchThread } from '../types';

interface Props {
    query: string;
    node: Node | null;
    onShowBest: () => void;
    onClose: () => void;
    subtitle?: string;
}

export function SearchThreadPanel({ query, node, onShowBest, onClose, subtitle }: Props) {
    const [thread, setThread] = useState<SearchThread | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [authorName, setAuthorName] = useState('');
    const [text, setText] = useState('');
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState('');
    const commentsRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');
        setThread(null);
        getSearchThread(query)
            .then((next) => {
                if (cancelled) return;
                setThread(next);
                setStatus('ready');
            })
            .catch((error) => {
                console.error('Failed to load search thread', error);
                if (cancelled) return;
                setStatus('error');
            });
        return () => {
            cancelled = true;
        };
    }, [query]);

    const answer = displayedAnswer(thread?.answer ?? null, node);
    const showingMapNode = Boolean(node && thread?.answer && node.title !== thread.answer.title);

    const submitComment = (event: React.FormEvent) => {
        event.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || posting) return;
        setPosting(true);
        setPostError('');
        postSearchComment(query, authorName, trimmed)
            .then((comment) => {
                setThread((current) => current ? { ...current, comments: [...current.comments, comment] } : current);
                setText('');
                window.setTimeout(() => {
                    commentsRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
                }, 0);
            })
            .catch((error) => {
                console.error('Failed to post comment', error);
                setPostError('Could not post that comment.');
            })
            .then(() => {
                setPosting(false);
            });
    };

    return (
        <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-surface border-l border-gray-700 shadow-2xl z-50 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-start gap-3">
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-white truncate">{query}</h2>
                    {subtitle && <p className="text-xs text-textSecondary mt-1">{subtitle}</p>}
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {status === 'loading' && <p className="text-sm text-textSecondary">Loading…</p>}
                {status === 'error' && <p className="text-sm text-textSecondary">Could not load this search.</p>}
                {status === 'ready' && (
                    <>
                        <section aria-label="Best answer" className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-primary">
                                    {showingMapNode ? answer?.title : 'Best answer'}
                                </h3>
                                {showingMapNode && (
                                    <button type="button" onClick={onShowBest} className="text-xs text-textSecondary hover:text-white">
                                        Best answer
                                    </button>
                                )}
                            </div>
                            {answer ? (
                                <>
                                    {!showingMapNode && (
                                        <p className="text-white font-semibold">{answer.title}</p>
                                    )}
                                    <AnswerBody answer={answer} />
                                </>
                            ) : (
                                <p className="text-gray-300">No AI answer for this search yet.</p>
                            )}
                        </section>

                        <section aria-label="Comments" className="space-y-3">
                            <h3 className="text-lg font-semibold text-white">Comments</h3>
                            {thread && thread.comments.length === 0 && (
                                <p className="text-sm text-textSecondary">No comments yet.</p>
                            )}
                            <ul ref={commentsRef} className="space-y-3">
                                {thread?.comments.map((comment) => (
                                    <CommentItem key={comment.id} comment={comment} />
                                ))}
                            </ul>
                        </section>
                    </>
                )}
            </div>

            <form aria-label="Add a comment" onSubmit={submitComment} className="border-t border-gray-700 p-4 space-y-3">
                <input
                    type="text"
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    placeholder="Name"
                    aria-label="Name"
                    maxLength={40}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                />
                <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Write a comment"
                    aria-label="Comment"
                    maxLength={1000}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary resize-none"
                />
                {postError && <p className="text-sm text-red-400">{postError}</p>}
                <button
                    type="submit"
                    disabled={posting || text.trim() === ''}
                    className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                    Comment
                </button>
            </form>
        </div>
    );
}

function AnswerBody({ answer }: { answer: AiAnswer }) {
    return (
        <div className="space-y-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{answer.summary}</p>
            </div>
            {answer.steps.length > 0 && (
                <ol className="space-y-3">
                    {answer.steps.map((step, index) => (
                        <li key={`${index}-${step}`} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                                {index + 1}
                            </span>
                            <span className="text-gray-300">{step}</span>
                        </li>
                    ))}
                </ol>
            )}
            {(answer.difficulty || answer.timeEstimate || answer.costEstimate) && (
                <div className="grid grid-cols-3 gap-4">
                    <Stat label="Difficulty" value={`${answer.difficulty}/5`} />
                    <Stat label="Time" value={answer.timeEstimate || '—'} />
                    <Stat label="Cost" value={answer.costEstimate || '—'} />
                </div>
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-gray-800 p-3 rounded-lg text-center">
            <div className="text-xs text-gray-500 uppercase">{label}</div>
            <div className="text-white font-bold">{value}</div>
        </div>
    );
}

function CommentItem({ comment }: { comment: SearchComment }) {
    return (
        <li className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-medium text-white">{comment.authorName}</span>
                <time dateTime={comment.createdAt} className="text-xs text-textSecondary">
                    {formatCommentTime(comment.createdAt)}
                </time>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.text}</p>
        </li>
    );
}

function displayedAnswer(best: AiAnswer | null, node: Node | null): AiAnswer | null {
    if (node && best && node.title !== best.title) {
        return {
            title: node.title,
            summary: node.aiSummary,
            steps: node.steps ?? [],
            difficulty: node.difficulty,
            timeEstimate: node.timeEstimate,
            costEstimate: node.costEstimate,
            tools: node.tools ?? [],
            materials: node.materials ?? [],
        };
    }
    return best;
}

function formatCommentTime(iso: string): string {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
