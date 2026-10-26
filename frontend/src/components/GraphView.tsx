import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { buildMindMapRevealOrder } from '../utils/rabbitPath';

/** Pause between each new mind-map label appearing. */
const REVEAL_STEP_MS = 2200;

interface Props {
    data: GraphData;
    onNodeClick: (node: Node) => void;
}

function layoutPosition(index: number): { x: number; y: number } {
    return {
        x: (index % 3) * 260,
        y: Math.floor(index / 3) * 120 + (index % 2 === 0 ? 0 : 40),
    };
}

function GraphCanvas({ data, onNodeClick }: Props) {
    const { fitView } = useReactFlow();
    const revealOrder = useMemo(() => buildMindMapRevealOrder(data), [data]);
    const revealKey = `${data.slug ?? ''}:${revealOrder.join(',')}`;

    const [revealedCount, setRevealedCount] = useState(0);
    const [latestId, setLatestId] = useState<string | null>(null);

    const orderIndex = useMemo(
        () => new Map(revealOrder.map((id, i) => [id, i])),
        [revealOrder]
    );

    const visibleIds = useMemo(() => {
        return new Set(revealOrder.slice(0, revealedCount));
    }, [revealOrder, revealedCount]);

    const revealComplete = revealedCount >= revealOrder.length;

    useEffect(() => {
        setRevealedCount(revealOrder.length > 0 ? 1 : 0);
        setLatestId(revealOrder[0] ?? null);
    }, [revealKey, revealOrder]);

    useEffect(() => {
        if (revealComplete || revealOrder.length === 0) return;
        const nextId = revealOrder[revealedCount];
        const timer = window.setTimeout(() => {
            setRevealedCount((c) => Math.min(c + 1, revealOrder.length));
            if (nextId) setLatestId(nextId);
        }, REVEAL_STEP_MS);
        return () => window.clearTimeout(timer);
    }, [revealComplete, revealOrder, revealedCount]);

    const skipReveal = useCallback(() => {
        setRevealedCount(revealOrder.length);
        setLatestId(null);
    }, [revealOrder.length]);

    const nodes: FlowNode[] = useMemo(() => {
        return data.nodes
            .filter((n) => visibleIds.has(n.id))
            .map((n) => {
                const index = orderIndex.get(n.id) ?? 0;
                const isPrimary = n.id === data.primaryNodeId;
                const isNew = n.id === latestId;
                return {
                    id: n.id,
                    data: { label: n.title, original: n },
                    position: layoutPosition(index),
                    className: isNew ? 'mindmap-node-enter' : undefined,
                    style: {
                        background: isPrimary ? '#e8f0fe' : '#fff',
                        border: isPrimary ? '2px solid #1a73e8' : '1px solid #dadce0',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        width: 180,
                        fontSize: 13,
                        fontWeight: isPrimary ? 600 : 500,
                        color: '#202124',
                        boxShadow: isNew
                            ? '0 4px 14px rgba(26,115,232,.35)'
                            : '0 1px 3px rgba(60,64,67,.15)',
                    },
                };
            });
    }, [data.nodes, data.primaryNodeId, visibleIds, orderIndex, latestId]);

    const edges: FlowEdge[] = useMemo(() => {
        return data.edges
            .filter((e) => visibleIds.has(e.fromNodeId) && visibleIds.has(e.toNodeId))
            .map((e) => ({
                id: e.id,
                source: e.fromNodeId,
                target: e.toNodeId,
                animated: e.toNodeId === latestId,
                style: { stroke: '#4285F4', strokeWidth: 1.5 },
            }));
    }, [data.edges, visibleIds, latestId]);

    useEffect(() => {
        if (nodes.length === 0) return;
        const t = window.setTimeout(() => {
            fitView({ padding: 0.28, duration: revealComplete ? 200 : 550 });
        }, 40);
        return () => window.clearTimeout(t);
    }, [nodes.length, revealComplete, fitView]);

    return (
        <>
            {!revealComplete && revealOrder.length > 1 && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-full bg-white/95 border border-[#dadce0] shadow-sm text-sm text-[#70757a]">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#1a73e8] animate-pulse" />
                    <span>
                        Building map{' '}
                        <span className="text-[#202124] font-medium">
                            {revealedCount}/{revealOrder.length}
                        </span>
                    </span>
                    <button
                        type="button"
                        onClick={skipReveal}
                        className="text-[#1a0dab] hover:underline text-xs ml-1"
                    >
                        Show all
                    </button>
                </div>
            )}
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
        </>
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
