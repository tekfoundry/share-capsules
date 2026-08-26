<!-- DO NOT INCLUDE IN OUTPUT
Agent note: phase:number must render as the ordinal phase number. Headings must
start with "Phase N: ". phase:status should be a short lifecycle word such as
accepted, in progress, completed, or blocked. Do not use task markers in phase
headings. -->

### Phase {{ phase:number }}: {{ phase:title }} (status: {{ phase:status }})

Goal: {{ phase:goal }}

Tasks:

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: expand task rows with sections/task.md. Preserve task markers
exactly: ⬜️ not started, 🟨 in progress, ✅ completed, ⚠️ validation gap or
follow-up risk. -->

{{ repeat:phase.tasks section:task }}

Verification:

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: list concrete checks expected for this phase. Include exact
commands when known, manual validation needs, security-sensitive paths,
data-integrity checks, error/recovery paths, and known unverified areas. -->

- {{ phase:verification }}

Documentation impact:

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: classify `_docs/kb` impact by product, requirements, architecture,
security, quality, operations, decisions, and glossary. Record "none" only
after checking the affected behavior. -->

- {{ phase:docs_impact }}

Execution notes:

<!-- DO NOT INCLUDE IN OUTPUT
Agent note: add notes only after implementation or verification work has
actually happened. Remove this block from untouched backlog phases. -->

{{ repeat:phase.execution_notes section:execution-note }}
