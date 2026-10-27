import assert from 'node:assert/strict'
import { test } from 'node:test'
import { offlineGenerateRabbitHoleGraph } from '../offlineGraph'
import { overseerAgent } from './overseer'

test('overseer accepts valid draft when reviewer approves', () => {
    const draft = offlineGenerateRabbitHoleGraph('Is the moon landing real?')
    const decision = overseerAgent('Is the moon landing real?', draft, { approved: true, issues: [] })
    assert.equal(decision.accept, true)
    assert.ok(decision.graph)
})

test('overseer rejects when reviewer rejects', () => {
    const draft = offlineGenerateRabbitHoleGraph('Is the moon landing real?')
    const decision = overseerAgent('Is the moon landing real?', draft, {
        approved: false,
        issues: ['Spine does not reach the question'],
    })
    assert.equal(decision.accept, false)
    assert.equal(decision.revisionNotes.length > 0, true)
})
