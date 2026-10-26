import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { GraphView } from '../components/GraphView';
import { SearchThreadPanel } from '../components/SearchThreadPanel';
import { searchNodes } from '../api/client';
import { GraphData, Node } from '../types';

const emptyGraph: GraphData = { nodes: [], edges: [], path: [] };

export default function RabbitHolePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryParam = searchParams.get('q') ?? '';
    const [draft, setDraft] = useState(queryParam);
    const [graphData, setGraphData] = useState<GraphData>(emptyGraph);
    const [focusedNode, setFocusedNode] = useState<Node | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setDraft(queryParam);
    }, [queryParam]);

    useEffect(() => {
        const trimmed = queryParam.trim();
        if (!trimmed) {
            setGraphData(emptyGraph);
            setFocusedNode(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setFocusedNode(null);

        searchNodes(trimmed)
            .then((data) => {
                if (cancelled) return;
                setGraphData(data);
            })
            .catch((error) => {
                console.error('Search failed', error);
                if (!cancelled) setGraphData(emptyGraph);
            })
            .then(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [queryParam]);

    const openTopic = (nextQuery: string) => {
        const trimmed = nextQuery.trim();
        if (!trimmed) return;
        setSearchParams({ q: trimmed });
    };

    if (!queryParam.trim()) {
        return (
            <div className="min-h-screen bg-background text-text flex items-center justify-center p-6">
                <div className="max-w-md text-center space-y-4">
                    <p className="text-textSecondary">Pick a search from the latest list to open its rabbit hole.</p>
                    <Link to="/" className="inline-block bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium">
                        Browse latest searches
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="app w-full h-screen flex flex-col bg-background text-text overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full z-10 pointer-events-none">
                <div className="pointer-events-auto">
                    <div className="max-w-2xl mx-auto px-4 pt-3 flex justify-start">
                        <Link to="/" className="text-sm text-textSecondary hover:text-white">
                            ← Latest searches
                        </Link>
                    </div>
                    <SearchBar query={draft} onQueryChange={setDraft} onSearch={openTopic} />
                </div>
            </div>

            <div className="flex-1 relative h-full">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                )}

                <GraphView
                    key={queryParam}
                    data={graphData}
                    onNodeClick={setFocusedNode}
                />
            </div>

            <SearchThreadPanel
                query={queryParam}
                node={focusedNode}
                onShowBest={() => setFocusedNode(null)}
                onClose={() => setFocusedNode(null)}
                subtitle="Comment to improve this rabbit hole"
            />
        </div>
    );
}
