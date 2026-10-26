import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    fallbackTopicGraph,
    normalizePathTitles,
    parseTopicGraph,
    planGraphEdges,
} from './parseTopicGraph';

describe('parseTopicGraph', () => {
    it('fallback builds a multi-node path and branches', () => {
        const graph = fallbackTopicGraph('patch hole in drywall');
        assert.ok(graph.pathTitles.length >= 3);
        assert.ok(graph.branches.length >= 2);
        assert.equal(graph.primary.title.toLowerCase(), 'patch hole in drywall');
    });

    it('normalizePathTitles appends primary title when missing', () => {
        const path = normalizePathTitles(['Home', 'Drywall'], 'Patch Hole');
        assert.ok(path.some((t) => t.toLowerCase() === 'patch hole'));
    });

    it('planGraphEdges connects path and branches', () => {
        const graph = fallbackTopicGraph('bleed a radiator');
        const edges = planGraphEdges(graph);
        assert.ok(edges.length >= graph.pathTitles.length - 1 + graph.branches.length);
    });

    it('parses nested primary from generator-shaped JSON', () => {
        const graph = parseTopicGraph(
            {
                primary: {
                    title: 'Bleed A Radiator',
                    category: 'PLUMBING',
                    aiSummary: 'Neutral summary.',
                    steps: ['Step one'],
                    difficulty: 2,
                    timeEstimate: '30 min',
                    costEstimate: 'Low',
                    tools: [],
                    materials: [],
                    commonMistakes: [],
                },
                pathTitles: ['Home', 'Plumbing', 'Bleed A Radiator'],
                branches: [],
            },
            'how to bleed a radiator'
        );
        assert.equal(graph.primary.category, 'PLUMBING');
        assert.equal(graph.pathTitles[graph.pathTitles.length - 1], 'Bleed A Radiator');
    });
});
