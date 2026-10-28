import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { loadGraph, jiraRequest } from './jira.js';
import { analyseChange, similarChanges } from './core/trace.js';
import { impactRecordBody, releaseReadiness } from './core/record.js';
import { seedSample } from './core/seed.js';
import { suggestItems } from './core/suggest.js';
import { createReverificationTasks } from './core/reverify.js';

const projectOf = (issueKey) => String(issueKey).split('-')[0];

async function impactFor(issueKey) {
  const { graph } = await loadGraph(projectOf(issueKey));
  const node = graph.get(issueKey);
  if (!node) return { traced: false };
  if (node.role !== 'change') return { traced: true, role: node.role };
  const report = analyseChange(graph, issueKey);
  const suggestions = report.items.length === 0 ? suggestItems(graph, issueKey) : [];
  return { traced: true, role: 'change', summary: node.summary, report, similar: similarChanges(graph, issueKey), suggestions };
}

const resolver = new Resolver();

resolver.define('getPanelData', async ({ context }) => impactFor(context.extension.issue.key));

resolver.define('createImpactRecord', async ({ payload, context }) => {
  const issueKey = context.extension.issue.key;
  const { graph } = await loadGraph(projectOf(issueKey));
  const report = analyseChange(graph, issueKey);
  const now = new Date().toISOString();
  const spaces = await (await api.asUser().requestConfluence(route`/wiki/api/v2/spaces?keys=${payload.spaceKey}`)).json();
  const space = spaces.results?.[0];
  if (!space) return { ok: false, error: `No Confluence space with key ${payload.spaceKey} is visible to you.` };
  const title = `Impact assessment ${issueKey} ${now.slice(0, 16).replace('T', ' ')} UTC`;
  const res = await api.asUser().requestConfluence(route`/wiki/api/v2/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      spaceId: space.id,
      status: 'current',
      title,
      body: { representation: 'storage', value: impactRecordBody(report, graph.get(issueKey), now) },
    }),
  });
  if (!res.ok) return { ok: false, error: `Confluence ${res.status}: ${await res.text()}` };
  const page = await res.json();
  const url = `${page._links?.base || ''}${page._links?.webui || ''}`;
  await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}/remotelink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      object: { url, title },
      application: { type: 'com.atlassian.confluence', name: 'Confluence' },
      relationship: 'Impact assessment',
    }),
  });
  return { ok: true, url, title };
});

resolver.define('getVersions', async ({ context }) => {
  const projectKey = context.extension.project.key;
  const res = await api.asUser().requestJira(route`/rest/api/3/project/${projectKey}/versions`);
  return res.ok ? (await res.json()).map((v) => ({ id: v.id, name: v.name, released: v.released })) : [];
});

resolver.define('getRelease', async ({ payload, context }) => {
  const projectKey = context.extension.project.key;
  const { graph, issues } = await loadGraph(projectKey);
  const changeKeys = issues
    .filter((i) => graph.get(i.key)?.role === 'change')
    .filter((i) => !payload.versionId || (i.fields.fixVersions || []).some((v) => v.id === payload.versionId))
    .map((i) => i.key);
  return releaseReadiness(graph, changeKeys);
});

resolver.define('linkItem', async ({ payload, context }) => {
  const issueKey = context.extension.issue.key;
  const { graph } = await loadGraph(projectOf(issueKey));
  if (graph.get(payload.itemKey)?.role !== 'item') return { ok: false, error: `${payload.itemKey} is not a software item.` };
  await jiraRequest('POST', '/rest/api/3/issueLink', {
    type: { name: 'Relates' }, inwardIssue: { key: issueKey }, outwardIssue: { key: payload.itemKey },
  });
  return { ok: true };
});

resolver.define('createReverification', async ({ context }) => {
  const issueKey = context.extension.issue.key;
  const { graph } = await loadGraph(projectOf(issueKey));
  const report = analyseChange(graph, issueKey);
  if (report.verifications.length === 0) return { ok: false, error: 'No verification on this change\'s path.' };
  const created = await createReverificationTasks(jiraRequest, projectOf(issueKey), report);
  return { ok: true, created };
});

resolver.define('seedSample', async ({ context }) => seedSample(jiraRequest, context.extension.project.key));

export const handler = resolver.getDefinitions();

// Rovo actions and MCP tools share these handlers.
const compact = (list) => list.map((x) => ({ key: x.key, summary: x.summary, status: x.status, path: x.via.join(' > ') }));

export async function getChangeImpact(payload) {
  const issueKey = String(payload.issueKey || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]+-\d+$/.test(issueKey)) return { error: 'Provide a Jira issue key such as DEMO-12.' };
  const r = await impactFor(issueKey);
  if (!r.traced) return { error: `${issueKey} has no trace-* label, so it is not part of the trace.` };
  if (r.role !== 'change') return { error: `${issueKey} is a ${r.role}, not a change. Ask about an issue labelled trace-change.` };
  const rep = r.report;
  return {
    change: issueKey,
    summary: r.summary,
    highestSafetyClass: rep.safetyClass,
    items: compact(rep.items),
    requirements: compact(rep.requirements),
    riskControls: compact(rep.controls),
    hazards: compact(rep.hazards),
    verificationToRepeat: compact(rep.verifications),
    documentsToReview: compact(rep.documents),
    openFindings: rep.findings,
    similarPastChanges: r.similar,
  };
}

export async function getReleaseReadiness(payload) {
  const projectKey = String(payload.projectKey || '').trim().toUpperCase();
  const { graph, issues } = await loadGraph(projectKey);
  const changeKeys = issues
    .filter((i) => graph.get(i.key)?.role === 'change')
    .filter((i) => !payload.version || (i.fields.fixVersions || []).some((v) => v.name === payload.version))
    .map((i) => i.key);
  return releaseReadiness(graph, changeKeys);
}
