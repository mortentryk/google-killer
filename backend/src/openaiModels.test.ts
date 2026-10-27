import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveOpenAiModel } from './openaiModels'

test('reviewer defaults to gpt-4o when no env', () => {
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_WRITER_MODEL
    delete process.env.OPENAI_REVIEWER_MODEL
    assert.equal(resolveOpenAiModel('writer'), 'gpt-4o-mini')
    assert.equal(resolveOpenAiModel('reviewer'), 'gpt-4o')
})

test('role-specific models override shared OPENAI_MODEL', () => {
    process.env.OPENAI_MODEL = 'gpt-4o-mini'
    process.env.OPENAI_WRITER_MODEL = 'gpt-4o-mini'
    process.env.OPENAI_REVIEWER_MODEL = 'gpt-4.1'
    assert.equal(resolveOpenAiModel('writer'), 'gpt-4o-mini')
    assert.equal(resolveOpenAiModel('reviewer'), 'gpt-4.1')
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_WRITER_MODEL
    delete process.env.OPENAI_REVIEWER_MODEL
})
