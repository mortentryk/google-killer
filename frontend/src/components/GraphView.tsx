import React, { useEffect, useMemo } from 'react';
import ReactFlow, {
    Node as FlowNode,
    Edge as FlowEdge,
    Controls,
    Background,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphData, Node } from '../types';

interface Props {
    data: GraphData;
    onNodeClick: (node: Node) => void;
}

function FitViewOnDataChange({ nodeCount }: { nodeCount: number }) {
    const { fitView } = useReactFlow();

    useEffect(() => {
        if (nodeCount === 0) return;
        const timer = window.setTimeout(() => {
            fitView({ padding: 0.25, duration: 200 });
        }, 50);
        return () => window.clearTimeout(timer);
    }, [nodeCount, fitView]);

    return null;
}

function GraphFlow({ data, onNodeClick }: Props) {
    const mappedNodes: FlowNode[] = useMemo(() => {
        return data.nodes.map((n, i) => ({
            id: n.id,
            data: { label: n.title, original: n },
            position: { x: (i % 3) * 280, y: Math.floor(i / 3) * 140 },
            style: {
                background: '#1b1b21',
                border: '2px solid #6c63ff',
                color: '#eaeaea',
                borderRadius: 12,
                padding: 12,
                width: 180,
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'center',
            },
        }));
    }, [data.nodes]);

    const mappedEdges: FlowEdge[] = useMemo(() => {
        return data.edges.map((e) => ({
            id: e.id,
            source: e.fromNodeId,
            target: e.toNodeId,
            animated: true,
            style: { stroke: '#6c63ff', strokeWidth: 2 },
        }));
    }, [data.edges]);

    const [nodes, setNodes, onNodesChange] = useNodesState(mappedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(mappedEdges);

    useEffect(() => {
        setNodes(mappedNodes);
    }, [mappedNodes, setNodes]);

    useEffect(() => {
        setEdges(mappedEdges);
    }, [mappedEdges, setEdges]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => onNodeClick(node.data.original)}
            fitView
            style={{ width: '100%', height: '100%' }}
            proOptions={{ hideAttribution: true }}
        >
            <FitViewOnDataChange nodeCount={nodes.length} />
            <Background color="#2f2f3a" gap={20} size={1} />
            <Controls className="bg-surface border-gray-700 fill-text" />
        </ReactFlow>
    );
}

export function GraphView({ data, onNodeClick }: Props) {
    return (
        <div className="w-full h-full min-h-0" style={{ width: '100%', height: '100%' }}>
            {data.nodes.length === 0 ? (
                <div className="flex h-full items-center justify-center text-textSecondary">
                    Search for a topic to see the mind-map
                </div>
            ) : (
                <ReactFlowProvider>
                    <div className="h-full w-full">
                        <GraphFlow data={data} onNodeClick={onNodeClick} />
                    </div>
                </ReactFlowProvider>
            )}
        </div>
    );
}
