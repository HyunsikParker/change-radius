// Fetches the trace graph for one Jira project as the current user, so results respect Jira permissions.
import api, { route, assumeTrustedRoute } from '@forge/api';
import { fromJira } from './core/jira-adapter.js';
import { buildGraph } from './core/trace.js';

const ROLE_LABELS = ['trace-change', 'trace-item', 'trace-requirement', 'trace-hazard', 'trace-control', 'trace-verification', 'trace-problem'];
const MAX_ISSUES = 500;
const REMOTE_LINK_ROLES = new Set(['change', 'item', 'requirement', 'hazard', 'control']);

async function jiraJson(path, options) {
  const res = await api.asUser().requestJira(path, options);
  if (!res.ok) throw new Error(`Jira ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export async function fetchProjectIssues(projectKey) {
  const jql = `project = "${projectKey}" AND labels in (${ROLE_LABELS.join(', ')}) ORDER BY key ASC`;
  const issues = [];
  let nextPageToken;
  do {
    const body = { jql, fields: ['summary', 'labels', 'status', 'issuelinks', 'fixVersions'], maxResults: 100 };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const page = await jiraJson(route`/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    issues.push(...(page.issues || []));
    nextPageToken = page.nextPageToken;
  } while (nextPageToken && issues.length < MAX_ISSUES);
  return issues;
}

export async function fetchRemoteLinks(issues) {
  const byKey = {};
  for (const issue of issues) {
    const labels = issue.fields?.labels || [];
    const role = labels.find((l) => l.startsWith('trace-'))?.slice(6);
    if (!REMOTE_LINK_ROLES.has(role)) continue;
    byKey[issue.key] = await jiraJson(route`/rest/api/3/issue/${issue.key}/remotelink`);
  }
  return byKey;
}

export async function loadGraph(projectKey) {
  const issues = await fetchProjectIssues(projectKey);
  const remote = await fetchRemoteLinks(issues);
  const { nodes, links } = fromJira(issues, remote);
  return { graph: buildGraph(nodes, links), issues };
}

// For the app's own constant paths (seeding); never pass user input as `path`.
export async function jiraRequest(method, path, body) {
  const res = await api.asUser().requestJira(assumeTrustedRoute(path), {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Jira ${method} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
