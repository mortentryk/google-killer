import React, { useEffect, useMemo } from 'react';
import ReactFlow, {
    Node as FlowNode,
    Edge as FlowEdge,
    Controls,
    Background,
    ReactFlowProvider,
    useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphData, Node } from '../types';

interface Props {
    data: GraphData;
    onNodeClick: (node: Node) => void;
}

function GraphCanvas({ data, onNodeClick }: Props) {
    const { fitView } = useReactFlow();

    const nodes: FlowNode[] = useMemo(() => {
        return data.nodes.map((n, i) => ({
            id: n.id,
            data: { label: n.title, original: n },
            position: { x: (i % 3) * 260, y: Math.floor(i / 3) * 120 + (i % 2 === 0 ? 0 : 40) },
            style: {
                background: '#fff',
                border: '1px solid #dadce0',
                borderRadius: '12px',
                padding: '10px 14px',
                width: 180,
                fontSize: 13,
                fontWeight: 500,
                color: '#202124',
                boxShadow: '0 1px 3px rgba(60,64,67,.15)',
            },
        }));
    }, [data.nodes]);

    const edges: FlowEdge[] = useMemo(() => {
        return data.edges.map((e) => ({
            id: e.id,
            source: e.fromNodeId,
            target: e.toNodeId,
            animated: false,
            style: { stroke: '#4285F4', strokeWidth: 1.5 },
        }));
    }, [data.edges]);

    useEffect(() => {
        if (data.nodes.length === 0) return;
        const t = window.setTimeout(() => {
            fitView({ padding: 0.25, duration: 200 });
        }, 50);
        return () => window.clearTimeout(t);
    }, [data.nodes, data.edges, fitView]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={(_, node) => onNodeClick(node.data.original)}
            proOptions={{ hideAttribution: true }}
            style={{ width: '100%', height: '100%' }}
        >
            <Background color="#dadce0" gap={24} size={1} />
            <Controls className="!bg-white !border-[#dadce0] !shadow-sm" />
        </ReactFlow>
    );
}

export function GraphView({ data, onNodeClick }: Props) {
    if (data.nodes.length === 0) {
        return null;
    }

    return (
        <div className="absolute inset-0 bg-[#f8f9fa]">
            <ReactFlowProvider>
                <GraphCanvas data={data} onNodeClick={onNodeClick} />
            </ReactFlowProvider>
        </div>
    );
}
