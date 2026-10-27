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
  const [searched, setSearched] = useState(false);

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const data = await searchNodes(query);
      setSearched(true);
      setGraphData(data);
      // Auto-select the last node in the path if available
      if (data.path.length > 0) {
        const lastNodeId = data.path[data.path.length - 1];
        const lastNode = data.nodes.find(n => n.id === lastNodeId);
        if (lastNode) setSelectedNode(lastNode);
      }
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const pathLabels = graphData.path
    .map((id) => graphData.nodes.find((n) => n.id === id)?.title)
    .filter(Boolean);

  return (
    <div className="app w-full h-screen flex flex-col bg-background text-text overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full z-10 pt-4 pointer-events-none">
        <div className="pointer-events-auto">
          <SearchBar onSearch={handleSearch} />
        </div>
        {pathLabels.length > 0 && (
          <p className="text-center text-sm text-textSecondary mt-2 px-4 truncate">
            Spine: {pathLabels.join(' → ')}
            {graphData.meta?.matched && (
              <span className="ml-2 text-xs opacity-70">({graphData.meta.matched})</span>
            )}
          </p>
        )}
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
        {searched && !loading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-textSecondary pointer-events-none">
            No rabbit hole for that yet.
          </div>
        )}
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
