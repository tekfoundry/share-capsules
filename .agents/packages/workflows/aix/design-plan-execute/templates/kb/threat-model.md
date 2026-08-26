# {{ threat_model:title }}

## Scope

Describe the implemented feature, command, workflow, or subsystem under review.

## Trust Boundaries

| Boundary | Trusted Side | Untrusted Side | Controls |
| --- | --- | --- | --- |
| {{ boundary:name }} | {{ boundary:trusted }} | {{ boundary:untrusted }} | {{ boundary:controls }} |

Use a trust-boundary diagram, attack-path sketch, permission matrix, or
command-flow trace when it explains the risk better than prose. If no visual is
needed, state why prose is sufficient.

## Assets

- {{ asset:name }}: {{ asset:risk }}

## Threats And Controls

- Threat: {{ threat:description }}
  Control: {{ threat:control }}
  Evidence: {{ threat:evidence }}

## File And Data Safety

- Writes, overwrites, deletes, or renames: {{ file_ops:summary }}
- Secrets or credentials: {{ secrets:summary }}
- External systems or network access: {{ external:summary }}

## Residual Risk

- {{ risk:item }}

## Evidence

- Implementation inspected: {{ evidence:implementation }}
- Security-sensitive tests inspected: {{ evidence:verification }}
- Related plans or decisions: {{ evidence:plans }}
- Open conflicts or follow-up: {{ evidence:gaps }}
