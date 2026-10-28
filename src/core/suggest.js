// Suggests software items for a change that has none linked yet, from past changes with similar wording.
// Plain token overlap (cosine over binary term sets, small stopword list); every suggestion names the past
// changes it came from, so a reviewer can check the reasoning.

const STOP = new Set(['a', 'an', 'and', 'the', 'to', 'of', 'in', 'on', 'for', 'from', 'with', 'by', 'before', 'after',
  'is', 'be', 'shall', 'should', 'when', 'into', 'at', 'as', 'or', 'update', 'change']);

export function terms(text) {
  return new Set(String(text).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t)));
}

function cosine(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / Math.sqrt(a.size * b.size);
}

export function suggestItems(graph, changeKey, { minSimilarity = 0.2, limit = 3 } = {}) {
  const change = graph.get(changeKey);
  if (!change || change.role !== 'change') throw new Error(`${changeKey} is not a change`);
  const mine = terms(change.summary);
  const votes = new Map();
  for (const [key, node] of graph) {
    if (key === changeKey || node.role !== 'change') continue;
    const sim = cosine(mine, terms(node.summary));
    if (sim < minSimilarity) continue;
    for (const item of node.neighbours) {
      if (graph.get(item).role !== 'item') continue;
      const v = votes.get(item) || { score: 0, from: [] };
      v.score += sim;
      v.from.push({ key, similarity: Math.round(sim * 100) / 100 });
      votes.set(item, v);
    }
  }
  return [...votes.entries()]
    .map(([key, v]) => ({ key, summary: graph.get(key).summary, safetyClass: graph.get(key).safetyClass || null, score: Math.round(v.score * 100) / 100, from: v.from }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, limit);
}
