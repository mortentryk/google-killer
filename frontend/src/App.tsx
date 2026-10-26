import React, { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { GraphView } from './components/GraphView';
import { NodeDetailsPanel } from './components/NodeDetailsPanel';
import { searchNodes } from './api/client';
import { GraphData, Node } from './types';

export default function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [], path: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    setLastQuery(query);
    try {
      const data = await searchNodes(query);
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
  };

  return (
    <div className="app w-full h-screen flex flex-col bg-background text-text overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full z-10 pt-4">
        <SearchBar onSearch={handleSearch} />
        {graphData.cached && lastQuery && (
          <p className="text-center text-xs text-textSecondary mt-2">
            Showing the stored result for this question — not a new AI call.
          </p>
        )}
        {error && (
          <p className="text-center text-sm text-red-400 mt-2 max-w-xl mx-auto px-4">
            {error}
          </p>
        )}
      </div>

      <div className="flex-1 relative h-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {!loading && !error && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-textSecondary px-6 text-center">
            Search for something like <span className="text-primary mx-1">radiator</span> or{' '}
            <span className="text-primary mx-1">plumbing</span> to open the shared mind map.
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
