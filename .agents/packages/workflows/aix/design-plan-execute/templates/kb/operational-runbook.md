# {{ runbook:title }}

## Scope

Describe the implemented operational process, runtime, release, rollback, or
support flow.

## Preconditions

- {{ precondition:item }}

## Procedure

1. {{ step:item }}

## Verification

- Smoke check: {{ check:smoke }}
- Release or rollback evidence: {{ check:release }}
- Monitoring or incident validation: {{ check:monitoring }}

Use a flow diagram, release checklist, command trace, or failure-mode trace
when it makes the operational path clearer than prose. If no visual is needed,
state why prose is sufficient.

## Failure And Recovery

- Failure: {{ failure:description }}
  Recovery: {{ failure:recovery }}

## Ownership

- Architecture owner: `technical-architect`
- Quality owner: `quality-engineer`
- Documentation coordinator: `documentation-specialist`

## Evidence

- Implementation inspected: {{ evidence:implementation }}
- Commands or procedures verified: {{ evidence:verification }}
- Related plans or decisions: {{ evidence:plans }}
- Open operational gaps: {{ evidence:gaps }}
