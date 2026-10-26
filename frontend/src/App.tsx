import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from './components/SearchBar';
import { LatestSearches } from './components/LatestSearches';
import { GraphView } from './components/GraphView';
import { SearchThreadPanel } from './components/SearchThreadPanel';
import { searchNodes } from './api/client';
import { GraphData, Node } from './types';

const emptyGraph: GraphData = { nodes: [], edges: [], path: [] };

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const [draft, setDraft] = useState(queryParam);
  const [graphData, setGraphData] = useState<GraphData>(emptyGraph);
  const [focusedNode, setFocusedNode] = useState<Node | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);

  useEffect(() => {
    setDraft(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const trimmed = queryParam.trim();
    if (!trimmed) {
      setGraphData(emptyGraph);
      setFocusedNode(null);
      setThreadOpen(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFocusedNode(null);
    setThreadOpen(true);

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
        if (cancelled) return;
        setLoading(false);
        setSearchRevision((revision) => revision + 1);
      });

    return () => {
      cancelled = true;
    };
  }, [queryParam]);

  const openMindMap = (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;
    setSearchParams({ q: trimmed });
  };

  return (
    <div className="app w-full h-screen flex flex-col bg-background text-text overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full z-10">
        <SearchBar query={draft} onQueryChange={setDraft} onSearch={openMindMap} />
        <LatestSearches
          refreshKey={searchRevision}
          activeQuery={queryParam}
        />
      </div>

      <div className="flex-1 relative h-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        <GraphView
          key={queryParam || 'empty'}
          data={graphData}
          onNodeClick={setFocusedNode}
        />
      </div>

      {threadOpen && queryParam.trim() && (
        <SearchThreadPanel
          query={queryParam}
          node={focusedNode}
          onShowBest={() => setFocusedNode(null)}
          onClose={() => setThreadOpen(false)}
        />
      )}
    </div>
  );
}
