import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ResultsHeader } from '../components/ResultsHeader';
import { GraphView } from '../components/GraphView';
import { RabbitHoleWalkView } from '../components/RabbitHoleWalkView';
import { NodeDetailsPanel } from '../components/NodeDetailsPanel';
import { AnswerDiscussionPanel } from '../components/AnswerDiscussionPanel';
import { getNode, getTopicBySlug, searchNodes } from '../api/client';
import { GraphData, Node, ResultView } from '../types';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useRabbitHole } from '../hooks/useRabbitHole';
import { RabbitHoleTrail } from '../components/RabbitHoleTrail';

export default function TopicPage() {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { push } = useSearchHistory();
    const { recordVisit } = useRabbitHole();

    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [focusDiscussion, setFocusDiscussion] = useState(false);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<ResultView>('answer');
    const [guidedPath, setGuidedPath] = useState(false);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const loadTopic = useCallback(async (topicSlug: string) => {
        setLoading(true);
        setError(null);
        setGraphData(null);
        try {
            const data = await getTopicBySlug(topicSlug);
            setGraphData(data);
            setQuery(data.displayQuery || '');
            setSelectedNode(null);
            setGuidedPath(false);
        } catch (err) {
            setGraphData(null);
            setError(err instanceof Error ? err.message : 'Topic not found');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (slug) loadTopic(slug);
    }, [slug, loadTopic]);

    useEffect(() => {
        const fromFeed = searchParams.get('discuss') === '1';
        const openMap = searchParams.get('map') === '1';
        setFocusDiscussion(fromFeed);
        if (openMap) {
            setView('map');
            setGuidedPath(false);
        } else if (fromFeed) {
            setView('answer');
        }
        if (fromFeed || openMap) {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('discuss');
                    next.delete('map');
                    return next;
                },
                { replace: true }
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    const [primaryNode, setPrimaryNode] = useState<Node | null>(null);

    useEffect(() => {
        if (!graphData?.primaryNodeId) {
            setPrimaryNode(null);
            return;
        }
        const fromGraph = graphData.nodes.find((n) => n.id === graphData.primaryNodeId);
        if (fromGraph) {
            setPrimaryNode(fromGraph);
            return;
        }
        getNode(graphData.primaryNodeId)
            .then(setPrimaryNode)
            .catch(() => setPrimaryNode(null));
    }, [graphData]);

    const runSearch = async (rawQuery: string, source: 'search' | 'trail' = 'search') => {
        const trimmed = rawQuery.trim();
        if (!trimmed) return;
        setLoading(true);
        setError(null);
        try {
            const data = await searchNodes(trimmed);
            push(trimmed);
            if (data.slug && data.primaryNodeId) {
                void recordVisit({
                    nodeId: data.primaryNodeId,
                    slug: data.slug,
                    displayQuery: data.displayQuery || trimmed,
                    source,
                });
            }
            if (data.slug) {
                setGraphData(null);
                setLoading(true);
                setView('map');
                setGuidedPath(false);
                navigate(`/q/${encodeURIComponent(data.slug)}?map=1`);
                return;
            }
            setError('Missing topic link from server');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
        }
        setLoading(false);
    };

    if (!slug) {
        return null;
    }

    return (
        <div className="w-full h-screen flex flex-col overflow-hidden bg-[#f8f9fa] text-[#202124]">
            <ResultsHeader
                query={query}
                onQueryChange={setQuery}
                onSearch={runSearch}
                onHome={() => navigate('/')}
                activeView={view}
                onViewChange={setView}
                resultCount={graphData?.nodes.length ?? 0}
                cached={graphData?.cached}
            />

            {view === 'answer' && <RabbitHoleTrail />}

            {error && (
                <p className="text-center text-sm text-[#d93025] py-3 px-4 bg-white border-b border-[#ebebeb]">
                    {error}
                </p>
            )}

            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/80">
                        <div className="w-10 h-10 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                        <p className="mt-4 text-sm text-[#70757a]">Loading shared result…</p>
                    </div>
                )}

                {!loading && graphData && view === 'answer' && primaryNode && graphData.slug && (
                    <AnswerDiscussionPanel
                        node={primaryNode}
                        displayQuery={graphData.displayQuery || query}
                        slug={graphData.slug}
                        cached={graphData.cached}
                        generated={graphData.generated}
                        focusDiscussion={focusDiscussion && !loading && !!primaryNode}
                    />
                )}

                {!loading && graphData && view === 'map' && !guidedPath && (
                    <div className="absolute inset-0 flex flex-col">
                        <div className="shrink-0 flex justify-end px-4 py-2 bg-white border-b border-[#ebebeb] z-10">
                            <button
                                type="button"
                                onClick={() => setGuidedPath(true)}
                                className="text-xs text-[#1a0dab] hover:underline"
                            >
                                Guided path (step-by-step)
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            <GraphView data={graphData} onNodeClick={setSelectedNode} />
                        </div>
                    </div>
                )}

                {!loading && graphData && view === 'map' && guidedPath && (
                    <div className="absolute inset-0 flex flex-col">
                        <div className="shrink-0 flex justify-end px-4 py-2 bg-white border-b border-[#ebebeb]">
                            <button
                                type="button"
                                onClick={() => setGuidedPath(false)}
                                className="text-xs text-[#1a0dab] hover:underline"
                            >
                                Mind map
                            </button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <RabbitHoleWalkView
                                data={graphData}
                                displayQuery={graphData.displayQuery || query}
                                onFollowBranch={() => {}}
                                onOpenNewTopic={(q: string) => void runSearch(q, 'trail')}
                                onShowAnswer={() => setView('answer')}
                            />
                        </div>
                    </div>
                )}
            </div>

            {selectedNode && view === 'map' && !guidedPath && (
                <NodeDetailsPanel
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    onFollowTrail={(trailQuery) => {
                        setSelectedNode(null);
                        void runSearch(trailQuery, 'trail');
                    }}
                />
            )}
        </div>
    );
}
