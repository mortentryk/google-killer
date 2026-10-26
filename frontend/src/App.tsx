import React, { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { LatestSearches } from './components/LatestSearches';
import { GraphView } from './components/GraphView';
import { NodeDetailsPanel } from './components/NodeDetailsPanel';
import { searchNodes } from './api/client';
import { GraphData, Node } from './types';

export default function App() {
  const [query, setQuery] = useState('');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [], path: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);

  const handleSearch = async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    setQuery(trimmed);
    setLoading(true);
    try {
      const data = await searchNodes(trimmed);
      setGraphData(data);
      if (data.path.length > 0) {
        const lastNodeId = data.path[data.path.length - 1];
        const lastNode = data.nodes.find(n => n.id === lastNodeId);
        setSelectedNode(lastNode ?? null);
      }
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
      setSearchRevision((revision) => revision + 1);
    }
  };

  return (
    <div className="app w-full h-screen flex flex-col bg-background text-text overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full z-10">
        <SearchBar query={query} onQueryChange={setQuery} onSearch={handleSearch} />
        <LatestSearches refreshKey={searchRevision} onSelect={handleSearch} />
      </div>

      <div className="flex-1 relative h-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        <GraphView
          data={graphData}
          onNodeClick={setSelectedNode}
        />
      </div>

      {selectedNode && (
        <NodeDetailsPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
