import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromJira, roleOf, safetyClassOf, confluencePageId } from '../src/core/jira-adapter.js';
import { buildGraph, analyseChange } from '../src/core/trace.js';

const issue = (key, labels, status = 'To Do', cat = 'new', links = []) => ({
  key,
  fields: { summary: `${key} summary`, labels, status: { name: status, statusCategory: { key: cat } }, issuelinks: links },
});
const out = (key) => ({ type: { name: 'Relates' }, outwardIssue: { key } });
const inw = (key) => ({ type: { name: 'Relates' }, inwardIssue: { key } });

test('labels decide role and class', () => {
  assert.equal(roleOf(['foo', 'trace-hazard']), 'hazard');
  assert.equal(roleOf(['trace-unknown']), null);
  assert.equal(safetyClassOf(['class-c']), 'C');
  assert.equal(confluencePageId('https://x.atlassian.net/wiki/spaces/RM/pages/98304/Risk+file'), '98304');
  assert.equal(confluencePageId('https://x.atlassian.net/wiki/pages/viewpage.action?pageId=77'), '77');
});

test('issues, links and Confluence pages become one graph', () => {
  const issues = [
    issue('P-1', ['trace-change'], 'In Progress', 'indeterminate', [out('P-2')]),
    issue('P-2', ['trace-item', 'class-b'], 'Done', 'done', [inw('P-1'), out('P-3'), out('P-99')]),
    issue('P-3', ['trace-requirement'], 'Done', 'done', [inw('P-2'), out('P-4')]),
    issue('P-4', ['trace-verification'], 'Done', 'done', [inw('P-3')]),
    issue('P-5', [], 'To Do', 'new', [out('P-1')]),
  ];
  const remote = {
    'P-2': [
      { application: { type: 'com.atlassian.confluence' }, object: { url: 'https://x/wiki/spaces/A/pages/12/Design', title: 'Design spec' } },
      { application: { type: 'other' }, object: { url: 'https://example.com', title: 'ignored' } },
    ],
    'P-1': [
      { application: { type: 'com.atlassian.confluence' }, relationship: 'Impact assessment', object: { url: 'https://x/wiki/spaces/A/pages/40/Impact', title: 'Impact assessment P-1' } },
    ],
  };
  const { nodes, links } = fromJira(issues, remote);
  assert.deepEqual(nodes.map((n) => n.key), ['P-1', 'P-2', 'P-3', 'P-4', 'PAGE-12']);
  assert.deepEqual(links, [['P-1', 'P-2'], ['P-2', 'P-3'], ['P-2', 'PAGE-12'], ['P-3', 'P-4']]);
  const r = analyseChange(buildGraph(nodes, links), 'P-1');
  assert.equal(r.safetyClass, 'B');
  assert.deepEqual(r.verifications.map((v) => v.key), ['P-4']);
  assert.deepEqual(r.documents.map((d) => d.key), ['PAGE-12']);
  assert.deepEqual(r.findings, []);
});
