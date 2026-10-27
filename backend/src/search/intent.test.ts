import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { intentSignature, pickBestHole, scoreIntentMatch, tokenSet } from './intent';

describe('intentSignature', () => {
    it('maps radiator paraphrases onto one signature', () => {
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
        assert.ok(signatures[0]);
    });

    it('keeps different problems apart', () => {
        assert.notEqual(intentSignature('cat litter'), intentSignature('radiator dripping'));
    });

    it('returns null when only stop words remain', () => {
        assert.equal(intentSignature('how do I'), null);
    });
});

describe('scoreIntentMatch', () => {
    it('picks the hole whose vocabulary overlaps the query', () => {
        const best = pickBestHole('my radiator is dripping', [
            { hole: { id: 'cat' }, vocabulary: tokenSet('best cat litter for odor') },
            { hole: { id: 'rad' }, vocabulary: tokenSet('Fix Leaking Radiator radiator valve drip') },
        ]);
        assert.equal(best?.hole.id, 'rad');
        assert.ok(best && best.match.score > 0.4);
    });

    it('rejects a hole with no overlap', () => {
        assert.equal(scoreIntentMatch(tokenSet('radiator dripping'), tokenSet('paint ceiling')), null);
    });
});
