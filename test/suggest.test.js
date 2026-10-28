import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../src/core/trace.js';
import { suggestItems, terms } from '../src/core/suggest.js';
import { SAMPLE_NODES, SAMPLE_LINKS } from '../src/core/sample.js';

test('terms drop stopwords and punctuation', () => {
  assert.deepEqual([...terms('Round the bolus dose to 0.05 mL!')], ['round', 'bolus', 'dose', '05', 'ml']);
});

test('an unlinked bolus change gets the dose calculator from past bolus changes', () => {
  const g = buildGraph([...SAMPLE_NODES, { key: 'CR-7', role: 'change', summary: 'Limit bolus rounding for neonatal mode', status: 'To Do' }], SAMPLE_LINKS);
  const s = suggestItems(g, 'CR-7');
  assert.equal(s[0].key, 'SI-1');
  assert.equal(s[0].safetyClass, 'C');
  assert.ok(s[0].from.some((f) => f.key === 'CR-0'));
  assert.ok(!s.some((x) => x.key === 'SI-2'));
});

test('no similar wording gives no suggestion', () => {
  const g = buildGraph([...SAMPLE_NODES, { key: 'CR-8', role: 'change', summary: 'Translate settings menu to Spanish', status: 'To Do' }], SAMPLE_LINKS);
  assert.deepEqual(suggestItems(g, 'CR-8'), []);
});
