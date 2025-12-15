import React, { useMemo } from 'react';
import ReactFlow, {
    Node as FlowNode,
    Edge as FlowEdge,
    Controls,
    Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphData, Node } from '../types';

interface Props {
    data: GraphData;
    onNodeClick: (node: Node) => void;
}

export function GraphView({ data, onNodeClick }: Props) {
    const nodes: FlowNode[] = useMemo(() => {
        return data.nodes.map((n, i) => ({
            id: n.id,
            data: { label: n.title, original: n },
            position: { x: i * 250, y: i * 100 + (i % 2 === 0 ? 0 : 50) }, // Simple staggered layout
            className: 'bg-surface border-2 border-primary text-text rounded-xl p-3 shadow-lg w-48 text-center text-sm font-medium hover:scale-105 transition-transform',
        }));
    }, [data.nodes]);

    const edges: FlowEdge[] = useMemo(() => {
        return data.edges.map(e => ({
            id: e.id,
            source: e.fromNodeId,
            target: e.toNodeId,
            animated: true,
            style: { stroke: '#6c63ff', strokeWidth: 2 },
        }));
    }, [data.edges]);

    return (
        <div className="w-full h-full bg-background">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodeClick={(_, node) => onNodeClick(node.data.original)}
                fitView
            >
                <Background color="#2f2f3a" gap={20} size={1} />
                <Controls className="bg-surface border-gray-700 fill-text" />
            </ReactFlow>
        </div>
    );
}
