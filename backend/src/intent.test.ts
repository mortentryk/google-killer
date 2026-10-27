import assert from 'node:assert/strict';
import { test } from 'node:test';
import { intentSignature, pickBestHole, scoreIntentMatch, tokenSet } from './intent';

test('paraphrases share one intent signature after normalization', () => {
    const phrases = [
        'my radiator is dripping',
        'radiator dripping',
        'dripping radiator',
        'fix leaking radiator',
        'leaking radiator',
        'my radiator leaks',
    ];
    const signatures = phrases.map(intentSignature);
    assert.equal(new Set(signatures).size, 1);
});

test('different problems get different signatures', () => {
    assert.notEqual(intentSignature('cat litter'), intentSignature('radiator dripping'));
});

test('fuzzy hole match uses vocabulary, not alias lists', () => {
    const query = 'my radiator is dripping';
    const holes = [
        {
            hole: { id: 'cat' },
            vocabulary: tokenSet('best cat litter for odor'),
        },
        {
            hole: { id: 'rad' },
            vocabulary: tokenSet('Fix Leaking Radiator radiator valve drip'),
        },
    ];
    const best = pickBestHole(query, holes);
    assert.equal(best?.hole.id, 'rad');
    assert.ok(best!.match.score > 0.4);
});

test('scoreIntentMatch needs enough overlap', () => {
    const query = tokenSet('radiator dripping');
    const hole = tokenSet('paint ceiling');
    assert.equal(scoreIntentMatch(query, hole), null);
});
