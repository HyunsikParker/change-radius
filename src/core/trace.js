// Deterministic change-impact analysis over a small trace graph.
// Nodes are Jira issues (or Confluence pages) with a trace role; edges are undirected links.
// No network, no LLM: every result carries the path that explains why it was included.

export const ROLES = ['change', 'item', 'requirement', 'hazard', 'control', 'verification', 'document', 'problem'];
const CLASS_ORDER = { A: 1, B: 2, C: 3 };

export function buildGraph(nodes, links) {
  const byKey = new Map();
  for (const n of nodes) {
    if (!ROLES.includes(n.role)) throw new Error(`unknown role ${n.role} on ${n.key}`);
    byKey.set(n.key, { ...n, neighbours: new Set() });
  }
  for (const [a, b] of links) {
    if (!byKey.has(a) || !byKey.has(b) || a === b) continue;
    byKey.get(a).neighbours.add(b);
    byKey.get(b).neighbours.add(a);
  }
  return byKey;
}

function neighboursWithRole(graph, key, role) {
  const node = graph.get(key);
  if (!node) return [];
  return [...node.neighbours].filter((k) => graph.get(k).role === role).sort();
}

function addOnce(map, key, via) {
  if (!map.has(key)) map.set(key, via);
}

// Impact of one change: items it modifies, then what hangs off those items.
export function analyseChange(graph, changeKey) {
  const change = graph.get(changeKey);
  if (!change || change.role !== 'change') throw new Error(`${changeKey} is not a change`);

  const items = new Map();
  for (const k of neighboursWithRole(graph, changeKey, 'item')) addOnce(items, k, [changeKey, k]);

  const requirements = new Map();
  for (const [item, via] of items) {
    for (const k of neighboursWithRole(graph, item, 'requirement')) addOnce(requirements, k, [...via, k]);
  }

  const controls = new Map();
  for (const [src, via] of [...items, ...requirements]) {
    for (const k of neighboursWithRole(graph, src, 'control')) addOnce(controls, k, [...via, k]);
  }

  const hazards = new Map();
  for (const [ctl, via] of controls) {
    for (const k of neighboursWithRole(graph, ctl, 'hazard')) addOnce(hazards, k, [...via, k]);
  }
  for (const [item, via] of items) {
    for (const k of neighboursWithRole(graph, item, 'hazard')) addOnce(hazards, k, [...via, k]);
  }

  const verifications = new Map();
  for (const [src, via] of [...requirements, ...controls, ...items]) {
    for (const k of neighboursWithRole(graph, src, 'verification')) addOnce(verifications, k, [...via, k]);
  }

  const documents = new Map();
  for (const [src, via] of [[changeKey, [changeKey]], ...items, ...requirements, ...controls, ...hazards]) {
    for (const k of neighboursWithRole(graph, src, 'document')) addOnce(documents, k, [...via, k]);
  }

  const classes = [...items.keys()].map((k) => graph.get(k).safetyClass).filter(Boolean);
  const safetyClass = classes.sort((a, b) => CLASS_ORDER[b] - CLASS_ORDER[a])[0] || null;

  return {
    change: changeKey,
    safetyClass,
    items: toList(graph, items),
    requirements: toList(graph, requirements),
    controls: toList(graph, controls),
    hazards: toList(graph, hazards),
    verifications: toList(graph, verifications),
    documents: toList(graph, documents),
    findings: findings(graph, items, requirements, controls, verifications),
  };
}

function toList(graph, map) {
  return [...map.entries()].map(([key, via]) => ({ key, summary: graph.get(key).summary, status: graph.get(key).status, via }));
}

function findings(graph, items, requirements, controls, verifications) {
  const out = [];
  for (const key of items.keys()) {
    if (!graph.get(key).safetyClass) out.push({ kind: 'item-without-class', key });
  }
  for (const key of requirements.keys()) {
    if (neighboursWithRole(graph, key, 'verification').length === 0) out.push({ kind: 'requirement-without-verification', key });
  }
  for (const key of controls.keys()) {
    if (neighboursWithRole(graph, key, 'verification').length === 0) out.push({ kind: 'control-without-verification', key });
  }
  for (const key of verifications.keys()) {
    if (!graph.get(key).passed) out.push({ kind: 'verification-not-passed', key });
  }
  return out;
}

// Past changes that touched the same items, ranked by item overlap, with the problems linked to them.
export function similarChanges(graph, changeKey, limit = 3) {
  const mine = new Set(neighboursWithRole(graph, changeKey, 'item'));
  const scored = [];
  for (const [key, node] of graph) {
    if (key === changeKey || node.role !== 'change') continue;
    const theirs = new Set(neighboursWithRole(graph, key, 'item'));
    const shared = [...mine].filter((k) => theirs.has(k));
    if (shared.length === 0) continue;
    const union = new Set([...mine, ...theirs]).size;
    scored.push({
      key,
      summary: node.summary,
      sharedItems: shared.sort(),
      overlap: shared.length / union,
      problems: neighboursWithRole(graph, key, 'problem').map((k) => ({ key: k, summary: graph.get(k).summary })),
    });
  }
  scored.sort((a, b) => b.problems.length - a.problems.length || b.overlap - a.overlap || a.key.localeCompare(b.key));
  return scored.slice(0, limit);
}
