# {{ kb_area:title }}

## Purpose

State what current implemented knowledge this area owns and what belongs
elsewhere.

## Owners

- Primary owner: `{{ role:primary }}`
- Supporting owners: `{{ role:supporting }}`

## Current Documents

- `{{ doc:path }}`: {{ doc:purpose }}

## Placement Rules

- Put {{ kb_area:included_knowledge }} here.
- Route {{ kb_area:excluded_knowledge }} to {{ kb_area:alternate_home }}.
- Keep historical execution notes in `_docs/plans/`.

## Freshness Checks

- Implementation behavior inspected: {{ evidence:implementation }}
- Plans inspected: {{ evidence:plans }}
- Last refresh evidence: {{ evidence:refresh }}
- Known gaps or conflicts: {{ evidence:gaps }}
