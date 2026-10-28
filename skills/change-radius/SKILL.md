---
name: change-radius
description: Explains what a Jira change request touches in a regulated software trace (software items and safety class, requirements, hazards, risk controls, verification to repeat, documents) and whether a release has open findings, using the Change Radius tools on the Atlassian MCP server. Use when someone asks what a change affects, which tests to repeat, or whether a release is ready.
---

# Change Radius

Change Radius is a Forge app for Jira and Confluence. It reads the trace a team keeps in Jira and reports what a
change request reaches. This skill tells an MCP client how to call the app's two tools and how to report what they
return.

## Connect

1. A site admin installs Change Radius and turns on "Expose tools to MCP-compatible apps" for it: Atlassian
   Administration > Apps > Sites > your site > Connected apps > Change Radius > app details. Do this for the Jira and
   the Confluence installation. External MCP access is part of Atlassian's Early Access Program and is off by default.
2. Add `https://mcp.atlassian.com/forge/ca77507f-1d7c-45e1-b89f-bf84ac8bc622` as a remote MCP server in your client
   and sign in. On the consent screen you choose the site. The tools run with your own Jira and Confluence permissions.

## Tools

- `get-change-impact`, input `issueKey`: a Jira issue labelled `trace-change`, for example `PUMP-1`. Returns the
  highest safety class among the affected software items; the requirements, risk controls, hazards, verification to
  repeat and documents, each with the link path that reached it; open findings; and similar past changes.
- `get-release-readiness`, inputs `projectKey` and optional `version` (a fix version name): lists the change requests
  with their open verification and findings, and says whether every change has a clean impact path.

## The trace the tools read

Each issue carries one `trace-<role>` label: `change`, `item`, `requirement`, `hazard`, `control`, `verification` or
`problem`. Issue links connect them. Software items carry a `class-a`, `class-b` or `class-c` safety class label.
Confluence pages linked from an issue count as documents.

## Answering

When the user asks about a change, call `get-change-impact` with its key and report, in this order:

1. The highest safety class among the affected software items.
2. Hazards and risk controls, each with its path, for example `PUMP-1 > PUMP-4 > PUMP-7 > PUMP-11`.
3. Verification to repeat. Mark anything that is not done.
4. Documents to review, with their links.
5. Open findings, then similar past changes and the problems that followed them.

When the user asks whether a release is ready, call `get-release-readiness` with the project key and the version
name.

## Limits

- Report only what the tools return. If a tool returns an error, show it and say what the user can fix, for example
  adding the `trace-change` label.
- Do not say whether a change is safe or acceptable; that decision belongs to the assessor. Do not claim compliance
  with any standard.
