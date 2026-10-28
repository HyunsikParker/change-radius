import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, analyseChange } from '../src/core/trace.js';
import { createReverificationTasks } from '../src/core/reverify.js';
import { SAMPLE_NODES, SAMPLE_LINKS } from '../src/core/sample.js';

test('one labelled task per verification, linked both ways', async () => {
  const report = analyseChange(buildGraph(SAMPLE_NODES, SAMPLE_LINKS), 'CR-1');
  const calls = [];
  let n = 1;
  const request = async (method, path, body) => {
    calls.push([path, body]);
    return path === '/rest/api/3/issue' ? { key: `CR-T${n++}` } : null;
  };
  const out = await createReverificationTasks(request, 'CR', report);
  assert.deepEqual(out.map((o) => o.verification).sort(), ['TC-21', 'TC-22']);
  const issues = calls.filter((c) => c[0] === '/rest/api/3/issue');
  assert.equal(issues.length, 2);
  assert.deepEqual(issues[0][1].fields.labels, ['trace-reverify']);
  assert.match(issues[0][1].fields.summary, /^Repeat TC-2[12] for CR-1: /);
  assert.equal(calls.filter((c) => c[0] === '/rest/api/3/issueLink').length, 4);
});
