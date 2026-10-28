// Maps Jira REST payloads to trace nodes and links. Pure functions; the Forge resolver does the fetching.
// Conventions: an issue's trace role is its `trace-<role>` label; a software item's safety class is a
// `class-a|b|c` label; Confluence pages linked to an issue (remote links) become document nodes.

const ROLE_LABEL = /^trace-(change|item|requirement|hazard|control|verification|problem)$/;
const CLASS_LABEL = /^class-([abc])$/i;

export function roleOf(labels = []) {
  for (const label of labels) {
    const m = ROLE_LABEL.exec(label);
    if (m) return m[1];
  }
  return null;
}

export function safetyClassOf(labels = []) {
  for (const label of labels) {
    const m = CLASS_LABEL.exec(label);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

export const IMPACT_RECORD = 'Impact assessment';

export function confluencePageId(url = '') {
  const m = /[?&]pageId=(\d+)/.exec(url) || /\/pages\/(\d+)/.exec(url);
  return m ? m[1] : null;
}

export function fromJira(issues, remoteLinksByKey = {}) {
  const nodes = [];
  const links = [];
  const keys = new Set();
  for (const issue of issues) {
    const fields = issue.fields || {};
    const role = roleOf(fields.labels);
    if (!role) continue;
    keys.add(issue.key);
    const node = {
      key: issue.key,
      role,
      summary: fields.summary || '',
      status: fields.status?.name || '',
      passed: fields.status?.statusCategory?.key === 'done',
    };
    const cls = safetyClassOf(fields.labels);
    if (cls) node.safetyClass = cls;
    nodes.push(node);
  }
  const seen = new Set();
  for (const issue of issues) {
    if (!keys.has(issue.key)) continue;
    for (const link of issue.fields?.issuelinks || []) {
      const other = link.outwardIssue?.key || link.inwardIssue?.key;
      if (!other || !keys.has(other)) continue;
      const pair = [issue.key, other].sort().join('|');
      if (seen.has(pair)) continue;
      seen.add(pair);
      links.push([issue.key, other]);
    }
    for (const remote of remoteLinksByKey[issue.key] || []) {
      if (remote.application?.type !== 'com.atlassian.confluence') continue;
      if (remote.relationship === IMPACT_RECORD) continue; // the app's own records are output, not documents to review
      const pageId = confluencePageId(remote.object?.url);
      if (!pageId) continue;
      const docKey = `PAGE-${pageId}`;
      if (!keys.has(docKey)) {
        keys.add(docKey);
        nodes.push({ key: docKey, role: 'document', summary: remote.object?.title || docKey, status: '', url: remote.object?.url });
      }
      links.push([issue.key, docKey]);
    }
  }
  return { nodes, links };
}
