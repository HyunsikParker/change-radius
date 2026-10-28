import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, analyseChange, similarChanges } from '../src/core/trace.js';
import { SAMPLE_NODES, SAMPLE_LINKS } from '../src/core/sample.js';

const graph = buildGraph(SAMPLE_NODES, SAMPLE_LINKS);
const keys = (list) => list.map((x) => x.key);

test('impact of the dose rounding change', () => {
  const r = analyseChange(graph, 'CR-1');
  assert.equal(r.safetyClass, 'C');
  assert.deepEqual(keys(r.items), ['SI-1']);
  assert.deepEqual(keys(r.requirements), ['SR-12', 'SR-14']);
  assert.deepEqual(keys(r.controls), ['RC-7']);
  assert.deepEqual(keys(r.hazards), ['HZ-3']);
  assert.deepEqual(keys(r.verifications).sort(), ['TC-21', 'TC-22']);
  assert.deepEqual(keys(r.documents).sort(), ['DOC-1', 'DOC-2']);
  assert.deepEqual(r.hazards[0].via, ['CR-1', 'SI-1', 'SR-12', 'RC-7', 'HZ-3']);
  assert.deepEqual(r.findings, []);
});

test('alarm change reports a failed verification and stays out of the dose chain', () => {
  const r = analyseChange(graph, 'CR-2');
  assert.equal(r.safetyClass, 'B');
  assert.deepEqual(keys(r.requirements), ['SR-20']);
  assert.deepEqual(r.hazards, []);
  assert.deepEqual(r.findings, [{ kind: 'verification-not-passed', key: 'TC-30' }]);
});

test('similar past change carries its problem report', () => {
  const s = similarChanges(graph, 'CR-1');
  assert.equal(s[0].key, 'CR-0');
  assert.deepEqual(s[0].sharedItems, ['SI-1']);
  assert.deepEqual(s[0].problems.map((p) => p.key), ['PR-5']);
});

test('unclassified item and unverified requirement become findings', () => {
  const g = buildGraph(
    [...SAMPLE_NODES, { key: 'CR-9', role: 'change', summary: 'Parse new library format', status: 'To Do' },
      { key: 'SR-40', role: 'requirement', summary: 'Reject libraries without a signature', status: 'Draft' }],
    [...SAMPLE_LINKS, ['CR-9', 'SI-3'], ['SI-3', 'SR-40']],
  );
  const r = analyseChange(g, 'CR-9');
  assert.equal(r.safetyClass, null);
  assert.deepEqual(r.findings, [
    { kind: 'item-without-class', key: 'SI-3' },
    { kind: 'requirement-without-verification', key: 'SR-40' },
  ]);
});

test('non-change key is rejected', () => {
  assert.throws(() => analyseChange(graph, 'SI-1'), /not a change/);
});
