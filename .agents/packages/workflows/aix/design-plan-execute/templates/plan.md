# {{ plan:title }}

## Status

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: render one lifecycle status marker and its label. Use only:
📝 Planning Draft, 💤 Backlog, 🟨 Active, or ✅ Completed. 
-->

{{ plan:status }}

## Context

Describe why the work matters, what prompted it, and what repository or product
facts shape the work.

{{ section:reviewed-context }}

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: section acceptance status values should be short lifecycle
words such as draft, accepted, in progress, completed, or blocked. Do not use
task markers in section headings. 
-->

## High-Level Goal (status: {{ goal:status }})

State the agreed outcome in terms of what should change and why that change
matters.

## Design Intent (status: {{ design:status }})

Capture the accepted implementation direction, ownership boundaries,
interfaces, tradeoffs, safety posture, and verification expectations.

## Non-Goals

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: remove this section if there are no meaningful non-goals. Do
not leave placeholder bullets in the final plan. 
-->

- {{ non_goal:item }}

## Boundaries And Invariants

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: use concrete project constraints, ownership rules, safety
rules, or runtime invariants. Remove placeholder bullets. 
-->

- {{ invariant:item }}

## Implementation Phases

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: expand each phase with sections/phase.md. Preserve the
workflow task markers exactly: ⬜️, 🟨, ✅, and ⚠️. 
-->

{{ repeat:phases section:phase }}

## Open Questions / Decisions

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: keep only unresolved or intentionally deferred decisions. If
none remain, write "None." or remove the section. 
-->

- {{ decision:item }}

{{ section:risks }}

## Lessons To Carry Forward

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: record reusable lessons only. Remove this section if there are
no lessons yet. 
-->

- {{ lesson:item }}

{{ section:completion-checklist }}
