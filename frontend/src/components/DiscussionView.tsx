import React, { useEffect, useState } from 'react';
import { Comment } from '../types';
import { getComments, postComment } from '../api/client';

interface Props {
    nodeId: string;
    nodeTitle: string;
}

export function DiscussionView({ nodeId, nodeTitle }: Props) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getComments(nodeId)
            .then((data) => {
                if (!cancelled) setComments(data);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [nodeId]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setPosting(true);
        setError(null);
        try {
            const created = await postComment(nodeId, text, authorName || undefined);
            setComments((prev) => [...prev, created]);
            setText('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not post');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <h2 className="text-lg text-[#202124] font-normal mb-1">Discussion</h2>
            <p className="text-sm text-[#70757a] mb-4">
                Is the shared answer for “{nodeTitle}” right? Everyone on this topic sees this thread.
            </p>

            {loading && <p className="text-sm text-[#70757a]">Loading…</p>}
            {error && <p className="text-sm text-[#d93025] mb-3">{error}</p>}

            <div className="space-y-3 mb-6">
                {comments.map((c) => (
                    <div key={c.id} className="border border-[#ebebeb] rounded-lg p-3 bg-white">
                        <div className="text-xs text-[#70757a] mb-1">{c.authorName}</div>
                        <p className="text-sm text-[#202124] whitespace-pre-wrap">{c.text}</p>
                    </div>
                ))}
                {!loading && comments.length === 0 && !error && (
                    <p className="text-sm text-[#70757a]">No comments yet.</p>
                )}
            </div>

            <form onSubmit={onSubmit} className="space-y-2 border-t border-[#ebebeb] pt-4">
                <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full border border-[#dfe1e5] rounded px-3 py-2 text-sm"
                />
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Does this answer look correct?"
                    rows={3}
                    className="w-full border border-[#dfe1e5] rounded px-3 py-2 text-sm"
                />
                <button
                    type="submit"
                    disabled={posting || !text.trim()}
                    className="bg-[#f8f9fa] border border-[#dadce0] hover:bg-[#f1f8ff] text-[#1a73e8] text-sm px-4 py-2 rounded disabled:opacity-50"
                >
                    {posting ? 'Posting…' : 'Post'}
                </button>
            </form>
        </div>
    );
}
