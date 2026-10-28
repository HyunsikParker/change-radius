import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box, Button, DynamicTable, EmptyState, Heading, Inline, Link, Lozenge, SectionMessage, Spinner, Stack,
  Tab, TabList, TabPanel, Tabs, Text, Textfield, Strong, xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const SECTIONS = [
  ['items', 'Software items'],
  ['requirements', 'Requirements'],
  ['controls', 'Risk controls'],
  ['hazards', 'Hazards'],
  ['verifications', 'Verification to repeat'],
  ['documents', 'Documents to review'],
];
const FINDING_TEXT = {
  'item-without-class': 'Software item has no safety class label (class-a, class-b or class-c).',
  'requirement-without-verification': 'Requirement has no linked verification.',
  'control-without-verification': 'Risk control has no linked verification.',
  'verification-not-passed': 'Verification is not done yet.',
};
const classAppearance = { C: 'removed', B: 'moved', A: 'success' };

const keyCell = (key) => (key.startsWith('PAGE-') ? <Text>{key}</Text> : <Link href={`/browse/${key}`}>{key}</Link>);

function Section({ title, rows }) {
  return (
    <Stack space="space.050">
      <Heading as="h4">{`${title} (${rows.length})`}</Heading>
      {rows.length === 0 ? (
        <Text>None reached through the trace links.</Text>
      ) : (
        <DynamicTable
          head={{ cells: [{ key: 'k', content: 'Key' }, { key: 's', content: 'Summary' }, { key: 'p', content: 'Reached through' }] }}
          rows={rows.map((r) => ({
            key: r.key,
            cells: [{ key: 'k', content: keyCell(r.key) }, { key: 's', content: r.summary }, { key: 'p', content: r.via.join(' → ') }],
          }))}
        />
      )}
    </Stack>
  );
}

function Reverify({ count }) {
  const [state, setState] = useState(null);
  const run = async () => {
    setState({ busy: true });
    setState(await invoke('createReverification'));
  };
  return (
    <Stack space="space.100">
      <Text>{`Create one task per verification to repeat (${count}), linked to this change and to the verification.`}</Text>
      <Inline><Button isDisabled={count === 0 || state?.busy || state?.ok} onClick={run}>Create re-verification tasks</Button></Inline>
      {state?.ok && <SectionMessage appearance="success"><Text>{`Created ${state.created.map((c) => c.task).join(', ')}.`}</Text></SectionMessage>}
      {state && state.ok === false && <SectionMessage appearance="error"><Text>{state.error}</Text></SectionMessage>}
    </Stack>
  );
}

function ImpactRecord() {
  const [spaceKey, setSpaceKey] = useState('');
  const [state, setState] = useState(null);
  const create = async () => {
    setState({ busy: true });
    setState(await invoke('createImpactRecord', { spaceKey: spaceKey.trim() }));
  };
  return (
    <Stack space="space.100">
      <Text>Write this analysis to a Confluence page and link it to the change.</Text>
      <Inline space="space.100" alignBlock="end">
        <Textfield name="space" placeholder="Confluence space key" onChange={(e) => setSpaceKey(e.target.value)} />
        <Button appearance="primary" isDisabled={!spaceKey.trim() || state?.busy} onClick={create}>Create impact record</Button>
      </Inline>
      {state?.ok && <SectionMessage appearance="success"><Text>Created <Link href={state.url} openNewTab>{state.title}</Link>.</Text></SectionMessage>}
      {state && state.ok === false && <SectionMessage appearance="error"><Text>{state.error}</Text></SectionMessage>}
    </Stack>
  );
}

function Suggestions({ suggestions }) {
  const [linked, setLinked] = useState({});
  const link = async (key) => {
    setLinked((s) => ({ ...s, [key]: 'busy' }));
    const r = await invoke('linkItem', { itemKey: key });
    setLinked((s) => ({ ...s, [key]: r.ok ? 'done' : r.error }));
  };
  if (suggestions.length === 0) {
    return <SectionMessage appearance="warning" title="No software item linked"><Text>Link the software items this change modifies; the impact analysis starts from them.</Text></SectionMessage>;
  }
  return (
    <SectionMessage appearance="information" title="No software item linked yet">
      <Stack space="space.100">
        <Text>Past changes with similar wording modified these items. Link the ones this change touches; reload the panel after linking.</Text>
        {suggestions.map((s) => (
          <Inline key={s.key} space="space.100" alignBlock="center">
            {keyCell(s.key)}
            <Text>{s.summary}</Text>
            {s.safetyClass && <Lozenge appearance={classAppearance[s.safetyClass]}>{`Class ${s.safetyClass}`}</Lozenge>}
            <Text>{`from ${s.from.map((f) => f.key).join(', ')}`}</Text>
            {linked[s.key] === 'done' ? <Lozenge appearance="success">Linked</Lozenge> : (
              <Button spacing="compact" isDisabled={linked[s.key] === 'busy'} onClick={() => link(s.key)}>Link</Button>
            )}
            {linked[s.key] && !['busy', 'done'].includes(linked[s.key]) && <Text>{linked[s.key]}</Text>}
          </Inline>
        ))}
      </Stack>
    </SectionMessage>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    invoke('getPanelData').then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <SectionMessage appearance="error"><Text>{error}</Text></SectionMessage>;
  if (!data) return <Spinner label="Reading trace links" />;
  if (!data.traced) {
    return (
      <EmptyState
        header="Not part of the trace"
        description="Label change requests trace-change and link them to software items (trace-item) to see their impact here."
      />
    );
  }
  if (data.role !== 'change') {
    return <Text>{`This issue is a ${data.role} in the trace. Open a change request (trace-change) to see an impact analysis.`}</Text>;
  }

  const { report, similar, suggestions = [] } = data;
  return (
    <Stack space="space.200">
      {report.items.length === 0 && <Suggestions suggestions={suggestions} />}
      <Inline space="space.100" alignBlock="center">
        <Text>Highest safety class</Text>
        {report.safetyClass ? <Lozenge appearance={classAppearance[report.safetyClass]} isBold>{`Class ${report.safetyClass}`}</Lozenge> : <Lozenge>Not set</Lozenge>}
        <Lozenge appearance={report.findings.length ? 'moved' : 'success'}>{report.findings.length ? `${report.findings.length} open findings` : 'No open findings'}</Lozenge>
      </Inline>
      <Tabs id="impact-tabs">
        <TabList>
          <Tab>Impact</Tab>
          <Tab>{`Similar changes (${similar.length})`}</Tab>
          <Tab>{`Findings (${report.findings.length})`}</Tab>
          <Tab>Record</Tab>
        </TabList>
        <TabPanel>
          <Box xcss={xcss({ paddingTop: 'space.150' })}>
            <Stack space="space.200">{SECTIONS.map(([field, title]) => <Section key={field} title={title} rows={report[field]} />)}</Stack>
          </Box>
        </TabPanel>
        <TabPanel>
          <Box xcss={xcss({ paddingTop: 'space.150' })}>
            {similar.length === 0 ? <Text>No earlier change touched the same software items.</Text> : (
              <Stack space="space.150">
                {similar.map((s) => (
                  <Stack key={s.key} space="space.050">
                    <Inline space="space.100">{keyCell(s.key)}<Text>{s.summary}</Text></Inline>
                    <Text>{`Shared items: ${s.sharedItems.join(', ')}`}</Text>
                    {s.problems.map((p) => (
                      <SectionMessage key={p.key} appearance="warning"><Text><Strong>{p.key}</Strong>{` followed this change: ${p.summary}`}</Text></SectionMessage>
                    ))}
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        </TabPanel>
        <TabPanel>
          <Box xcss={xcss({ paddingTop: 'space.150' })}>
            {report.findings.length === 0 ? <Text>Every requirement and risk control on this path has verification, and all of it is done.</Text> : (
              <Stack space="space.100">
                {report.findings.map((f) => (
                  <Inline key={`${f.kind}-${f.key}`} space="space.100">{keyCell(f.key)}<Text>{FINDING_TEXT[f.kind] || f.kind}</Text></Inline>
                ))}
              </Stack>
            )}
          </Box>
        </TabPanel>
        <TabPanel>
          <Box xcss={xcss({ paddingTop: 'space.150' })}>
            <Stack space="space.300"><ImpactRecord /><Reverify count={report.verifications.length} /></Stack>
          </Box>
        </TabPanel>
      </Tabs>
    </Stack>
  );
}

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
