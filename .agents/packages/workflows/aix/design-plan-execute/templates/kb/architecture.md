# {{ architecture:title }}

## Current Behavior

Describe the implemented architecture. Do not describe planned behavior as
current.

## Components

| Component | Responsibility | Owner | Notes |
| --- | --- | --- | --- |
| {{ component:name }} | {{ component:responsibility }} | {{ component:owner }} | {{ component:notes }} |

## Contracts

- Inputs: {{ contract:inputs }}
- Outputs: {{ contract:outputs }}
- Runtime assumptions: {{ contract:runtime }}
- Compatibility expectations: {{ contract:compatibility }}

## Flow

Use a diagram, sequence, lifecycle, state-machine, request, data, or
command-flow trace when it is clearer than prose.

```mermaid
flowchart TD
  A[{{ flow:start }}] --> B[{{ flow:step }}]
```

If no visual is needed, replace the diagram with the reason prose is clearer
or sufficient.

## Invariants

- {{ invariant:item }}

## Failure Modes

- {{ failure:item }}: {{ failure:handling }}

## Evidence

- Implementation inspected: {{ evidence:implementation }}
- Tests or verification inspected: {{ evidence:verification }}
- Related plans or decisions: {{ evidence:plans }}
- Open conflicts or follow-up: {{ evidence:gaps }}
