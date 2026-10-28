// Sample trace data for an infusion-pump style project. Fictional; used for tests and the "Load sample project" action.
export const SAMPLE_NODES = [
  { key: 'CR-1', role: 'change', summary: 'Round bolus dose to pump resolution before limit check', status: 'In Progress' },
  { key: 'CR-0', role: 'change', summary: 'Change bolus rounding from 0.1 to 0.05 mL', status: 'Done' },
  { key: 'CR-2', role: 'change', summary: 'Update alarm tone volume table', status: 'Done' },
  { key: 'SI-1', role: 'item', summary: 'Dose calculator', safetyClass: 'C', status: 'Released' },
  { key: 'SI-2', role: 'item', summary: 'Alarm manager', safetyClass: 'B', status: 'Released' },
  { key: 'SI-3', role: 'item', summary: 'Drug library loader', status: 'Released' },
  { key: 'SR-12', role: 'requirement', summary: 'Bolus dose shall not exceed the drug library hard limit', status: 'Approved' },
  { key: 'SR-14', role: 'requirement', summary: 'Displayed dose shall match delivered dose to 0.01 mL', status: 'Approved' },
  { key: 'SR-20', role: 'requirement', summary: 'Occlusion alarm shall sound within 2 s', status: 'Approved' },
  { key: 'HZ-3', role: 'hazard', summary: 'Overdose delivered to patient', status: 'Open' },
  { key: 'RC-7', role: 'control', summary: 'Hard limit check after rounding', status: 'Implemented' },
  { key: 'TC-21', role: 'verification', summary: 'Hard limit boundary test', status: 'Done', passed: true },
  { key: 'TC-22', role: 'verification', summary: 'Rounding accuracy test', status: 'Done', passed: true },
  { key: 'TC-30', role: 'verification', summary: 'Occlusion alarm latency test', status: 'To Do', passed: false },
  { key: 'DOC-1', role: 'document', summary: 'Software design specification, dose calculator', status: 'Current' },
  { key: 'DOC-2', role: 'document', summary: 'Risk management file', status: 'Current' },
  { key: 'PR-5', role: 'problem', summary: 'Rounded dose bypassed hard limit in boundary case', status: 'Closed' },
];

export const SAMPLE_LINKS = [
  ['CR-1', 'SI-1'], ['CR-0', 'SI-1'], ['CR-2', 'SI-2'], ['CR-0', 'PR-5'],
  ['SI-1', 'SR-12'], ['SI-1', 'SR-14'], ['SI-2', 'SR-20'],
  ['SR-12', 'RC-7'], ['RC-7', 'HZ-3'],
  ['SR-12', 'TC-21'], ['RC-7', 'TC-21'], ['SR-14', 'TC-22'], ['SR-20', 'TC-30'],
  ['SI-1', 'DOC-1'], ['HZ-3', 'DOC-2'],
];
