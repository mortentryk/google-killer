import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ResultsHeader } from '../components/ResultsHeader';
import { GraphView } from '../components/GraphView';
import { NodeDetailsPanel } from '../components/NodeDetailsPanel';
import { AnswerDiscussionPanel } from '../components/AnswerDiscussionPanel';
import { getNode, getTopicBySlug, searchNodes } from '../api/client';
import { GraphData, Node, ResultView } from '../types';
import { useSearchHistory } from '../hooks/useSearchHistory';

export default function TopicPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { push } = useSearchHistory();

    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<ResultView>('answer');
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const loadTopic = useCallback(async (topicSlug: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTopicBySlug(topicSlug);
            setGraphData(data);
            setQuery(data.displayQuery || '');
            setView('answer');
            setSelectedNode(null);
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

    const runSearch = async (rawQuery: string) => {
        const trimmed = rawQuery.trim();
        if (!trimmed) return;
        setLoading(true);
        setError(null);
        try {
            const data = await searchNodes(trimmed);
            push(trimmed);
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
                    />
                )}

                {!loading && graphData && view === 'map' && (
                    <div className="absolute inset-0">
                        <GraphView data={graphData} onNodeClick={setSelectedNode} />
                    </div>
                )}
            </div>

            {selectedNode && view === 'map' && (
                <NodeDetailsPanel
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    onFollowTrail={(trailQuery) => {
                        setSelectedNode(null);
                        void runSearch(trailQuery);
                    }}
                />
            )}
        </div>
    );
}
