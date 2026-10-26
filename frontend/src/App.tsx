import React, { useCallback, useEffect, useState } from 'react';
import { GraphView } from './components/GraphView';
import { NodeDetailsPanel } from './components/NodeDetailsPanel';
import { HomeLanding } from './components/HomeLanding';
import { ResultsHeader } from './components/ResultsHeader';
import { searchNodes } from './api/client';
import { GraphData, Node } from './types';
import { useSearchHistory } from './hooks/useSearchHistory';

function getInitialQuery(): string {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
}

export default function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [], path: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(getInitialQuery);
  const [hasSearched, setHasSearched] = useState(() => !!getInitialQuery());
  const { history, push } = useSearchHistory();

  const syncUrl = useCallback((q: string | null) => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const runSearch = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setQuery(trimmed);
    setHasSearched(true);
    syncUrl(trimmed);
    push(trimmed);

    try {
      const data = await searchNodes(trimmed);
      setGraphData(data);
      if (data.path.length > 0) {
        const lastNodeId = data.path[data.path.length - 1];
        const lastNode = data.nodes.find((n) => n.id === lastNodeId);
        if (lastNode) setSelectedNode(lastNode);
      } else {
        setSelectedNode(null);
      }
    } catch (err) {
      setGraphData({ nodes: [], edges: [], path: [] });
      setSelectedNode(null);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [push, syncUrl]);

  useEffect(() => {
    const initial = getInitialQuery();
    if (initial) runSearch(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goHome = () => {
    setHasSearched(false);
    setGraphData({ nodes: [], edges: [], path: [] });
    setSelectedNode(null);
    setError(null);
    syncUrl(null);
  };

  if (!hasSearched) {
    return (
      <HomeLanding
        query={query}
        onQueryChange={setQuery}
        onSearch={runSearch}
        history={history}
      />
    );
  }

  return (
    <div className="app w-full min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
      <ResultsHeader
        query={query}
        onQueryChange={setQuery}
        onSearch={runSearch}
        onHome={goHome}
        resultCount={graphData.nodes.length}
        cached={graphData.cached}
      />

      {error && (
        <p className="text-center text-sm text-[#d93025] py-3 px-4 bg-white border-b border-[#ebebeb]">
          {error}
        </p>
      )}

      <div className="flex-1 relative min-h-[calc(100vh-120px)]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/80">
            <div className="w-10 h-10 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-sm text-[#70757a]">Loading shared mind map…</p>
          </div>
        )}

        {!loading && !error && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[#70757a] px-6 text-center text-sm">
            No stored answer yet. Try <button type="button" className="text-[#1a0dab] mx-1 hover:underline" onClick={() => runSearch('radiator')}>radiator</button>
            or <button type="button" className="text-[#1a0dab] mx-1 hover:underline" onClick={() => runSearch('plumbing')}>plumbing</button>.
          </div>
        )}

        <GraphView data={graphData} onNodeClick={setSelectedNode} />
      </div>

      {selectedNode && (
        <NodeDetailsPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}
