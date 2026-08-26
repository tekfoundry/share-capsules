# {{ quality:title }}

## Quality Goal

Describe the current verification strategy for the implemented behavior.

## Risk Map

| Risk | Coverage | Gap |
| --- | --- | --- |
| {{ risk:name }} | {{ risk:coverage }} | {{ risk:gap }} |

## Verification Matrix

| Behavior | Check | Evidence | Owner |
| --- | --- | --- | --- |
| {{ behavior:name }} | {{ check:command_or_method }} | {{ evidence:summary }} | {{ owner:role }} |

Use a matrix, regression map, release-check table, or failure-mode trace when
it is clearer than prose. If no visual is needed, state why prose is
sufficient.

## Manual Validation

- Scenario: {{ manual:scenario }}
- Expected evidence: {{ manual:evidence }}
- Owner: {{ manual:owner }}

## Known Gaps

- {{ gap:item }}

## Evidence

- Implementation inspected: {{ evidence:implementation }}
- Automated checks inspected: {{ evidence:automation }}
- Related plans or decisions: {{ evidence:plans }}
- Residual risk: {{ evidence:risk }}
