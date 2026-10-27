import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateGeneratedGraph } from './validateGraph'
import { offlineGenerateRabbitHoleGraph } from './offlineGraph'

test('offline moon graph validates and has spine focus', () => {
    const graph = offlineGenerateRabbitHoleGraph('Is the moon landing real?')
    const validated = validateGeneratedGraph(graph)
    assert.equal(validated.focusSlug, 'moon-landing')
    assert.ok(validated.nodes.length >= 5)
    assert.ok(validated.edges.some(edge => edge.from === 'moon' && edge.to === 'space-program'))
})

test('rejects too many nodes', () => {
    const nodes = Array.from({ length: 25 }, (_, i) => ({
        slug: `n${i}`,
        title: `Node ${i}`,
        aiSummary: 'Summary',
        steps: [],
        tools: [],
        materials: [],
        commonMistakes: [],
        difficulty: 1,
        timeEstimate: '',
        costEstimate: '',
    }))
    assert.throws(() => validateGeneratedGraph({
        title: 'Big',
        focusSlug: 'n0',
        nodes,
        edges: [],
    }))
})
