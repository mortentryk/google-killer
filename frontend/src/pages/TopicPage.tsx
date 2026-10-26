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
    const [mapMode, setMapMode] = useState<'walk' | 'network'>('walk');
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const loadTopic = useCallback(async (topicSlug: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTopicBySlug(topicSlug);
            setGraphData(data);
            setQuery(data.displayQuery || '');
            setSelectedNode(null);
            setMapMode('walk');
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
        const startHole = searchParams.get('hole') === '1';
        setFocusDiscussion(fromFeed);
        if (startHole) {
            setView('map');
            setMapMode('walk');
        } else {
            setView('answer');
        }
        if (fromFeed || startHole) {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('discuss');
                    next.delete('hole');
                    return next;
                },
                { replace: true }
            );
        }
        // Read query flags only when the topic slug changes.
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
            if (data.slug) navigate(`/q/${data.slug}`);
            else setError('Missing topic link from server');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
            setLoading(false);
        }
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

            <RabbitHoleTrail />

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

                {!loading && graphData && view === 'map' && mapMode === 'walk' && (
                    <div className="absolute inset-0 flex flex-col">
                        <div className="shrink-0 flex justify-end px-4 py-2 bg-white border-b border-[#ebebeb]">
                            <button
                                type="button"
                                onClick={() => setMapMode('network')}
                                className="text-xs text-[#1a0dab] hover:underline"
                            >
                                Full network map
                            </button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <RabbitHoleWalkView
                                data={graphData}
                                displayQuery={graphData.displayQuery || query}
                                onFollowBranch={(node) => {
                                    if (node.id === graphData.primaryNodeId) return;
                                }}
                                onOpenNewTopic={(q) => void runSearch(q, 'trail')}
                            />
                        </div>
                    </div>
                )}

                {!loading && graphData && view === 'map' && mapMode === 'network' && (
                    <div className="absolute inset-0 flex flex-col">
                        <div className="shrink-0 flex justify-end px-4 py-2 bg-white border-b border-[#ebebeb] z-10">
                            <button
                                type="button"
                                onClick={() => setMapMode('walk')}
                                className="text-xs text-[#1a0dab] hover:underline"
                            >
                                Guided rabbit hole
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            <GraphView data={graphData} onNodeClick={setSelectedNode} />
                        </div>
                    </div>
                )}
            </div>

            {selectedNode && view === 'map' && (
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
