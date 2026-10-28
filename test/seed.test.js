import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedSample } from '../src/core/seed.js';

test('seeding creates labelled issues, then links between created keys', async () => {
  const calls = [];
  let n = 100;
  const request = async (method, path, body) => {
    calls.push([method, path, body]);
    if (path === '/rest/api/3/issue') return { key: `DEMO-${n++}` };
    if (method === 'GET' && path.endsWith('/transitions')) return { transitions: [{ id: '11', to: { statusCategory: { key: 'indeterminate' } } }, { id: '31', to: { statusCategory: { key: 'done' } } }] };
    return null;
  };
  const out = await seedSample(request, 'DEMO');
  const issues = calls.filter((c) => c[1] === '/rest/api/3/issue');
  const links = calls.filter((c) => c[1] === '/rest/api/3/issueLink');
  assert.equal(issues.length, 15);
  assert.deepEqual(issues.find((c) => c[2].fields.summary.startsWith('SI-1 ')) [2].fields.labels, ['trace-item', 'class-c']);
  assert.equal(links.length, 13);
  assert.equal(out.links, 13);
  assert.deepEqual(links[0][2].inwardIssue, { key: out.created['CR-1'] });
  assert.ok(calls.findIndex((c) => c[1] === '/rest/api/3/issueLink') > calls.map((c) => c[1]).lastIndexOf('/rest/api/3/issue'));
  const doneMoves = calls.filter((c) => c[0] === 'POST' && c[1].endsWith('/transitions'));
  assert.equal(doneMoves.length, 5);
  assert.ok(doneMoves.every((c) => c[2].transition.id === '31'));
});
