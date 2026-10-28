import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Button, DynamicTable, Inline, Link, Lozenge, SectionMessage, Select, Spinner, Stack, Text,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const ALL = { label: 'All change requests', value: '' };

function Readiness({ versionId, onLoaded }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setData(null);
    invoke('getRelease', { versionId })
      .then((d) => { setData(d); if (onLoaded) onLoaded(d); })
      .catch((e) => setError(String(e)));
  }, [versionId]);
  if (error) return <SectionMessage appearance="error"><Text>{error}</Text></SectionMessage>;
  if (!data) return <Spinner label="Analysing changes" />;
  if (data.changes.length === 0) return <Text>No change requests (trace-change) in this selection.</Text>;
  const blocked = data.changes.filter((c) => !c.ready).length;
  return (
    <Stack space="space.150">
      <SectionMessage appearance={data.ready ? 'success' : 'warning'} title={data.ready ? 'Every change has a clean impact path' : `${blocked} of ${data.changes.length} changes have open findings`}>
        <Text>Open findings are verification that is not done, requirements or controls without verification, and items without a safety class.</Text>
      </SectionMessage>
      <DynamicTable
        head={{ cells: [
          { key: 'k', content: 'Change' }, { key: 's', content: 'Summary' }, { key: 'c', content: 'Class' },
          { key: 'v', content: 'Verification still open' }, { key: 'f', content: 'Findings' },
        ] }}
        rows={data.changes.map((c) => ({
          key: c.key,
          cells: [
            { key: 'k', content: <Link href={`/browse/${c.key}`}>{c.key}</Link> },
            { key: 's', content: c.summary },
            { key: 'c', content: c.safetyClass ? <Lozenge appearance={c.safetyClass === 'C' ? 'removed' : 'default'}>{c.safetyClass}</Lozenge> : '—' },
            { key: 'v', content: c.openVerifications.join(', ') || 'None' },
            { key: 'f', content: c.ready ? <Lozenge appearance="success">Clean</Lozenge> : <Lozenge appearance="moved">{`${c.findings.length} open`}</Lozenge> },
          ],
        }))}
      />
    </Stack>
  );
}

function Seed({ onDone }) {
  const [state, setState] = useState(null);
  const seed = async () => {
    setState({ busy: true });
    try {
      const r = await invoke('seedSample');
      if (!r.ok) { setState({ ok: false, error: r.error }); return; }
      setState({ ok: true, count: Object.keys(r.created).length, links: r.links });
      onDone();
    } catch (e) {
      setState({ ok: false, error: String(e) });
    }
  };
  return (
    <Stack space="space.100">
      <Text>New here? Create a small fictional infusion-pump trace (15 issues, 13 links) in this project to try the app.</Text>
      <Inline><Button isDisabled={state?.busy || state?.ok} onClick={seed}>Load sample trace</Button></Inline>
      {state?.ok && <SectionMessage appearance="success"><Text>{`Created ${state.count} issues and ${state.links} links. Open the change "CR-1 Round bolus dose…" to see its impact panel.`}</Text></SectionMessage>}
      {state?.ok === false && <SectionMessage appearance="error"><Text>{state.error}</Text></SectionMessage>}
    </Stack>
  );
}

function App() {
  const [versions, setVersions] = useState(null);
  const [selected, setSelected] = useState(ALL);
  const [refresh, setRefresh] = useState(0);
  const [hasTrace, setHasTrace] = useState(null);
  useEffect(() => {
    invoke('getVersions').then(setVersions).catch(() => setVersions([]));
  }, []);
  const options = [ALL, ...(versions || []).map((v) => ({ label: v.released ? `${v.name} (released)` : v.name, value: v.id }))];
  return (
    <Stack space="space.300">
      <Stack space="space.100">
        <Text>Check every change request in a release against its trace before you ship.</Text>
        <Select inputId="version" options={options} value={selected} onChange={(o) => setSelected(o || ALL)} />
      </Stack>
      <Readiness key={`${selected.value}-${refresh}`} versionId={selected.value} onLoaded={(d) => { if (!selected.value) setHasTrace(d.changes.length > 0); }} />
      {hasTrace === false && <Seed onDone={() => setRefresh((n) => n + 1)} />}
    </Stack>
  );
}

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
