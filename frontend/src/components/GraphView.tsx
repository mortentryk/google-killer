import React, { useMemo } from 'react';
import ReactFlow, {
    Node as FlowNode,
    Edge as FlowEdge,
    Controls,
    Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Edge, GraphData, Node } from '../types';

interface Props {
    data: GraphData;
    onNodeClick: (node: Node) => void;
}

function layoutGraph(nodes: Node[], edges: Edge[], path: string[]) {
    const children = new Map<string, string[]>();
    for (const node of nodes) children.set(node.id, []);
    for (const edge of edges) {
        children.get(edge.fromNodeId)?.push(edge.toNodeId);
    }

    const pos = new Map<string, { x: number; y: number }>();
    path.forEach((id, index) => pos.set(id, { x: 40 + index * 280, y: 20 }));

    const seen = new Set(path);
    let current = [...path];
    let depth = 1;
    while (current.length) {
        const next: string[] = [];
        for (const id of current) {
            for (const child of children.get(id) || []) {
                if (seen.has(child)) continue;
                seen.add(child);
                next.push(child);
            }
        }
        next.forEach((id, index) => pos.set(id, { x: 40 + index * 240, y: 20 + depth * 150 }));
        current = next;
        depth += 1;
    }

    nodes.forEach((node, index) => {
        if (!pos.has(node.id)) pos.set(node.id, { x: 40 + index * 240, y: 20 });
    });
    return pos;
}

export function GraphView({ data, onNodeClick }: Props) {
    const positions = useMemo(
        () => layoutGraph(data.nodes, data.edges, data.path),
        [data.nodes, data.edges, data.path],
    );
    const onPath = useMemo(() => new Set(data.path), [data.path]);

    const nodes: FlowNode[] = useMemo(() => {
        return data.nodes.map((n) => ({
            id: n.id,
            data: { label: n.title, original: n },
            position: positions.get(n.id) || { x: 0, y: 0 },
            className: onPath.has(n.id)
                ? 'bg-surface border-2 border-primary text-text rounded-xl p-3 shadow-lg w-48 text-center text-sm font-medium hover:scale-105 transition-transform'
                : 'bg-surface border border-gray-600 text-text rounded-xl p-3 shadow-lg w-48 text-center text-sm font-medium hover:scale-105 transition-transform',
        }));
    }, [data.nodes, onPath, positions]);

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
                key={data.path.join(',')}
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
