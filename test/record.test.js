import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, analyseChange } from '../src/core/trace.js';
import { impactRecordBody, releaseReadiness } from '../src/core/record.js';
import { SAMPLE_NODES, SAMPLE_LINKS } from '../src/core/sample.js';

const graph = buildGraph(SAMPLE_NODES, SAMPLE_LINKS);

test('impact record lists every section with its path and escapes text', () => {
  const report = analyseChange(graph, 'CR-1');
  const body = impactRecordBody(report, { summary: 'Round <bolus> & check' }, '2026-10-28T00:00:00Z');
  assert.match(body, /Round &lt;bolus&gt; &amp; check/);
  assert.match(body, /<h2>Hazards \(1\)<\/h2>/);
  assert.match(body, /CR-1 → SI-1 → SR-12 → RC-7 → HZ-3/);
  assert.match(body, /No open findings/);
});

test('release with the alarm change is not ready', () => {
  const r = releaseReadiness(graph, ['CR-1', 'CR-2']);
  assert.equal(r.ready, false);
  assert.deepEqual(r.changes.map((c) => [c.key, c.ready, c.openVerifications]), [
    ['CR-1', true, []],
    ['CR-2', false, ['TC-30']],
  ]);
});
