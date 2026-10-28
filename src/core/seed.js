// Seeds the sample trace project into an existing Jira project through an injected request function,
// so the logic is testable without Forge. `request(method, path, body)` resolves to parsed JSON or null.
import { SAMPLE_NODES, SAMPLE_LINKS } from './sample.js';

export async function seedSample(request, projectKey, issueTypeName = 'Task') {
  const created = {};
  for (const node of SAMPLE_NODES) {
    if (node.role === 'document') continue;
    const labels = [`trace-${node.role}`];
    if (node.safetyClass) labels.push(`class-${node.safetyClass.toLowerCase()}`);
    const res = await request('POST', '/rest/api/3/issue', {
      fields: {
        project: { key: projectKey },
        issuetype: { name: issueTypeName },
        summary: `${node.key} ${node.summary}`,
        labels,
      },
    });
    created[node.key] = res.key;
  }
  let links = 0;
  for (const [a, b] of SAMPLE_LINKS) {
    if (!created[a] || !created[b]) continue;
    await request('POST', '/rest/api/3/issueLink', {
      type: { name: 'Relates' },
      inwardIssue: { key: created[a] },
      outwardIssue: { key: created[b] },
    });
    links += 1;
  }
  return { created, links };
}
