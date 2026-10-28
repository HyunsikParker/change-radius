# Change Radius

Change impact analysis for regulated device software, inside Jira and Confluence. Open a change request and see which
software items it modifies, the highest safety class among them, the requirements, risk controls and hazards on the
path, the verification to repeat and the documents to review. Every row shows the chain of links that reached it.

Built on Atlassian Forge for Codegeist 2026 (category: Apps for Specialized Industries).

## How the trace is read

Change Radius uses what is already in Jira. Each issue in the trace carries one label:

| Label | Meaning |
|---|---|
| `trace-change` | a change request |
| `trace-item` | a software item (add `class-a`, `class-b` or `class-c` for its safety class) |
| `trace-requirement` | a requirement |
| `trace-hazard` | a hazard |
| `trace-control` | a risk control measure |
| `trace-verification` | a test or other verification (done status counts as passed) |
| `trace-problem` | a problem report that followed a change |

Issue links of any type connect them. Confluence pages linked to an issue become documents to review.

## What you get

- **Change impact panel** on Jira issues labelled `trace-change`: impact by section with the link path, open findings,
  similar past changes and the problem reports that followed them, item suggestions for a change with no item linked
  yet, an impact record written to Confluence, and one re-verification task per verification to repeat.
- **Release impact page** (Jira project page): every change in a fix version with open verification and findings, and
  a button that loads a fictional infusion-pump sample trace (15 issues, 13 links) so you can try the app quickly.
- **Rovo agent "Change Radius Analyst"** and the same two actions over **Rovo MCP**: `get-change-impact` and
  `get-release-readiness`.

Change Radius does not decide whether a change is safe or acceptable. It assembles the trace so that the person who
must decide can see it, and it records the analysis for review. It is not a certified tool and makes no compliance claim.

## Try it

1. Install the app on a Jira site with Confluence (installation link on the Devpost page).
2. Open any Jira project, choose **Apps → Release impact**, and press **Load sample trace**.
3. Open the issue whose summary starts with `CR-1`. The **Change impact** panel shows the analysis.

## Architecture

- `src/core/`: plain JavaScript, no network: `trace.js` (graph and breadth-first impact paths), `jira-adapter.js`
  (Jira payloads to nodes and links), `record.js` (Confluence page body, release readiness), `suggest.js` (item
  suggestions from similar wording), `seed.js` and `reverify.js` (Jira writes through an injected request function),
  `sample.js` (fictional data).
- `src/index.js`: Forge resolvers for the UI and handlers for the Rovo actions; Jira and Confluence are called as the
  current user (`asUser`), so people see only what they are allowed to see.
- `src/frontend/`: UI Kit panel and project page.
- No LLM calls in the app. The Rovo agent uses Rovo's own model on the site that runs it.

## Development

```sh
npm install
npm test          # node --test, core logic
forge lint
forge deploy -e development
forge install --site <your-site>.atlassian.net -p Jira -e development
```

## Credits

Built with help from an AI coding assistant (Anthropic Claude). Sample data is fictional.

## Licence

MIT.
