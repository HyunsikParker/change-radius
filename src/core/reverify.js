// Creates one Jira task per verification a change must repeat, linked to the change and to the verification.
// `request(method, path, body)` is injected so the flow is testable without Forge.

export async function createReverificationTasks(request, projectKey, report, issueTypeName = 'Task') {
  const created = [];
  for (const v of report.verifications) {
    const res = await request('POST', '/rest/api/3/issue', {
      fields: {
        project: { key: projectKey },
        issuetype: { name: issueTypeName },
        summary: `Repeat ${v.key} for ${report.change}: ${v.summary}`.slice(0, 254),
        labels: ['trace-reverify'],
      },
    });
    await request('POST', '/rest/api/3/issueLink', { type: { name: 'Relates' }, inwardIssue: { key: report.change }, outwardIssue: { key: res.key } });
    await request('POST', '/rest/api/3/issueLink', { type: { name: 'Relates' }, inwardIssue: { key: res.key }, outwardIssue: { key: v.key } });
    created.push({ task: res.key, verification: v.key });
  }
  return created;
}
