// Turns an impact analysis into a Confluence page body (storage format) and a release readiness summary.
import { analyseChange } from './trace.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SECTIONS = [
  ['items', 'Affected software items'],
  ['requirements', 'Requirements'],
  ['controls', 'Risk controls'],
  ['hazards', 'Hazards'],
  ['verifications', 'Verification to repeat'],
  ['documents', 'Documents to review'],
];

const FINDING_TEXT = {
  'item-without-class': 'Software item has no safety class',
  'requirement-without-verification': 'Requirement has no linked verification',
  'control-without-verification': 'Risk control has no linked verification',
  'verification-not-passed': 'Verification is not in a done status',
};

export function findingText(kind) {
  return FINDING_TEXT[kind] || kind;
}

export function impactRecordBody(report, change, generatedAt) {
  const parts = [];
  parts.push(`<p><strong>Change:</strong> ${esc(report.change)} ${esc(change?.summary)}</p>`);
  parts.push(`<p><strong>Highest safety class among affected items:</strong> ${esc(report.safetyClass || 'not set')}</p>`);
  parts.push(`<p><strong>Generated:</strong> ${esc(generatedAt)} from the Jira trace links at that time.</p>`);
  for (const [field, title] of SECTIONS) {
    const rows = report[field];
    parts.push(`<h2>${esc(title)} (${rows.length})</h2>`);
    if (rows.length === 0) {
      parts.push('<p>None found through the trace links.</p>');
      continue;
    }
    parts.push('<table><tbody><tr><th>Key</th><th>Summary</th><th>Status</th><th>Reached through</th></tr>');
    for (const r of rows) {
      parts.push(`<tr><td>${esc(r.key)}</td><td>${esc(r.summary)}</td><td>${esc(r.status)}</td><td>${esc(r.via.join(' → '))}</td></tr>`);
    }
    parts.push('</tbody></table>');
  }
  parts.push(`<h2>Open findings (${report.findings.length})</h2>`);
  if (report.findings.length === 0) parts.push('<p>No open findings.</p>');
  else parts.push(`<ul>${report.findings.map((f) => `<li>${esc(f.key)}: ${esc(findingText(f.kind))}</li>`).join('')}</ul>`);
  parts.push('<h2>Assessment</h2><p>To be completed by the assessor: safety impact, decision and sign-off.</p>');
  return parts.join('\n');
}

// Per change in a release: open findings and verifications still to pass.
export function releaseReadiness(graph, changeKeys) {
  const changes = changeKeys.map((key) => {
    const r = analyseChange(graph, key);
    return {
      key,
      summary: graph.get(key).summary,
      safetyClass: r.safetyClass,
      openVerifications: r.verifications.filter((v) => !graph.get(v.key).passed).map((v) => v.key),
      findings: r.findings,
      ready: r.findings.length === 0,
    };
  });
  return { ready: changes.every((c) => c.ready), changes };
}
