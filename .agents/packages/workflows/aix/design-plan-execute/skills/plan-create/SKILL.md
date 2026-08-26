---
name: plan-create
description: Start and refine a backlog implementation plan from user intent, repository context, and explicit success criteria. Use when a user asks to plan-create, create, draft, or turn an idea into a plan; always place new plans under `_docs/plans/backlog/` for developer review before activation.
---

# Plan Create

Use this skill to turn an initial request into a decision-complete backlog
plan through a collaborative technical-design process. This is a planning
workflow; do not implement the proposed work unless the user explicitly
activates the backlog plan afterward.

Act as a technical design partner. Lead the user from a high-level product
goal into implementation-ready design intent and phased work, but keep the
conversation grounded in explicit user agreement at each major step.

## Role Collaboration

`plan-create` owns the planning procedure and the backlog plan artifact. Roles
can supply bounded specialist judgment, but they do not own template
resolution, file placement, lifecycle state, accepted gates, final task
breakdown, or user-facing handoff.

When `.agents/roles/product-strategist.md` exists and the plan needs stronger
vision, audience, value, scope, tradeoff, sequencing, or product-fit judgment,
use `delegate-to-role` or a prompt-overlay delegation to request a bounded
product-strategy pass. Fold the returned evidence into `Context`,
`High-Level Goal`, open questions, risks, and later scope boundaries as
appropriate.

When `.agents/roles/product-designer.md` exists and the plan involves user
flows, interaction design, accessibility, layout hierarchy, prototypes,
terminal UX, prompts, or design-system fit, use `delegate-to-role` or a
prompt-overlay delegation to request a bounded product-design pass. Fold the
returned evidence into `Design Intent`, `Non-Goals`,
`Boundaries And Invariants`, verification expectations, implementation-phase
constraints, open questions, and human review notes as appropriate. Do not use
the role to finalize product surfaces without developer review.

When `.agents/roles/requirements-engineer.md` exists and the high-level goal
has been accepted, use `delegate-to-role` or a prompt-overlay delegation to
request a bounded requirements pass for Design Intent. Good triggers include
requirements, actors, workflows, inputs, outputs, constraints, non-goals,
boundaries, invariants, acceptance signals, open decisions, and
plan-readiness judgment. Fold the returned evidence into `Design Intent`,
`Non-Goals`, `Boundaries And Invariants`, verification expectations, risks,
Security Review expectations, implementation-phase constraints, open
questions, and human review notes as appropriate. Do not use the role to
invent requirements from thin context or to approve implementation phases
before Design Intent is accepted.

When `.agents/roles/technical-architect.md` exists and the plan involves
system boundaries, component contracts, module ownership, runtime contracts,
integration choices, data flow, persistence, package-management behavior,
workflow lifecycle behavior, or maintainability tradeoffs, use
`delegate-to-role` or a prompt-overlay delegation to request a bounded
architecture pass. Fold the returned evidence into accepted `Design Intent`,
`Boundaries And Invariants`, implementation-phase order, task boundaries,
verification expectations, risks, and promotion-to-design notes as
appropriate. Use architecture review to shape phases only after Design Intent
is accepted.

When `.agents/roles/security-engineer.md` exists and the plan involves trust
boundaries, secrets, authentication, authorization, permissions, dependency or
supply-chain risk, local file writes, overwrites, deletes, renames, external
systems, network access, package trust, workflow installation or updates,
source resolution, lockfile integrity, or other safety-sensitive behavior, use
`delegate-to-role` or a prompt-overlay delegation to request a bounded security
pass. Fold the returned evidence into `Design Intent`, `Non-Goals`,
`Boundaries And Invariants`, verification expectations, risks, Security Review
expectations, implementation-phase constraints, open questions, and human
review notes as appropriate. Do not use the role to approve unsafe behavior or
waive security findings.

When `.agents/roles/ux-writer.md` exists and the plan changes user-facing or
developer-facing text, use `delegate-to-role` or a prompt-overlay delegation
to request a bounded UX writing pass. Good triggers include labels, prompts,
command help, terminal output, errors, empty states, onboarding copy, README
language, workflow instructions, or other docs copy that tells users what to
do. Fold the returned evidence into `Design Intent`, `Non-Goals`,
`Boundaries And Invariants`, verification expectations, implementation-phase
constraints, open questions, and human review notes as appropriate. Do not use
the role to finalize product claims, support promises, security language,
legal text, release commitments, or other wording that needs developer review.

When `.agents/roles/quality-engineer.md` exists and Design Intent has been
accepted, use `delegate-to-role` or a prompt-overlay delegation to request a
bounded quality pass for acceptance checks, verification strategy, regression
risk, evidence expectations, skipped-check rationale, manual validation needs,
and validation gaps. Fold the returned evidence into verification
expectations, risks, implementation-phase constraints, completion checklist
notes, open questions, and human review notes as appropriate. Do not use the
role to run commands, mark phases ready, waive checks, or take over
`work-verify`.

When `.agents/roles/documentation-specialist.md` exists and the plan changes
durable behavior, project-owned docs, README or workflow docs, developer-facing
instructions, examples, or documentation closeout expectations, use
`delegate-to-role` or a prompt-overlay delegation to request a bounded
documentation-impact pass. Good triggers include `_docs` placement,
design-promotion notes, current-state documentation, README or workflow-doc
updates, index links, stale docs risk, and closeout expectations. Fold the
returned evidence into `Design Intent`, implementation-phase constraints,
documentation impact, promotion-to-design notes, completion checklist notes,
open questions, risks, and human review notes as appropriate. Do not use the
role to invent design truth, promote speculative behavior, finalize docs, or
take over `review-and-refresh-docs`, `design-create`, or `design-promote`.

When `.agents/roles/implementation-engineer.md` exists and Design Intent has
been accepted, use `delegate-to-role` or a prompt-overlay delegation to request
bounded implementation-readiness input before phases and tasks are finalized.
Good triggers include scoped task boundaries, phase sequencing, likely changed
areas, dependencies, test and fixture ownership, verification handoff,
documentation impact, execution risks, and whether a planned task is small
enough for `task-execute`. Fold returned evidence into implementation phases,
task lists, likely changed areas, verification expectations, documentation
impact, risks, open questions, and human review notes as appropriate. Do not
use the role to authorize execution, edit files, mark tasks ready without
developer acceptance, or bypass `plan-review`, `plan-activate`,
`plan-execute`, `phase-execute`, `task-execute`, or `work-verify`.

Do not require `product-strategist` for direct use. If the role is unavailable
or the host cannot delegate, continue the planning session yourself by asking
concise product-vision questions and recording the answers in the living plan.
Do not require `product-designer` for direct use either. If the role is
unavailable or the host cannot delegate, continue the planning session yourself
by asking concise flow, interaction, accessibility, and design-system questions
when those concerns apply.
Do not require `requirements-engineer` for direct use either. If the role is
unavailable or the host cannot delegate, continue the planning session yourself
by asking concise requirements, actor, workflow, constraint, non-goal,
boundary, acceptance-signal, and open-decision questions after the high-level
goal is accepted.
Do not require `technical-architect` for direct use either. If the role is
unavailable or the host cannot delegate, continue the planning session yourself
by asking concise boundary, contract, integration, maintainability, and
verification questions when those concerns apply.
Do not require `security-engineer` for direct use either. If the role is
unavailable or the host cannot delegate, continue the planning session yourself
by asking concise trust-boundary, credential, authorization, file-operation,
dependency, failure-path, and safety-verification questions when those
concerns apply.
Do not require `ux-writer` for direct use either. If the role is unavailable or
the host cannot delegate, continue the planning session yourself by asking
concise reader, task, terminology, prompt, error, empty-state, onboarding,
README, and verification questions when copy or docs language concerns apply.
Do not require `quality-engineer` for direct use either. If the role is
unavailable or the host cannot delegate, continue the planning session yourself
by asking concise acceptance-check, targeted-test, regression-risk,
manual-validation, skipped-check, evidence, and residual-risk questions after
Design Intent is accepted.
Do not require `documentation-specialist` for direct use either. If the role is
unavailable or the host cannot delegate, continue the planning session yourself
by asking concise documentation-impact, `_docs` placement, design-promotion,
current-state accuracy, README, workflow-doc, index-link, and closeout
questions when durable behavior or project documentation may change.
Do not require `implementation-engineer` for direct use either. If the role is
unavailable or the host cannot delegate, continue the planning session yourself
by asking concise task-boundary, phase-order, likely-file, dependency,
test-ownership, docs-impact, and verification-handoff questions after Design
Intent is accepted.

## Workflow

1. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   `_docs/kb` docs, and related active or backlog plans. Read completed plans
   only when specific historical decisions, regressions, or migrations are
   relevant to the requested plan.
2. Classify the work as backlog planning unless it is clearly a micro-fix.
   Do not promote backlog work autonomously.
3. If the user has not already provided a high-level goal, ask them to
   summarize the goal in terms of what they want and why it matters. Do not
   require them to know the implementation approach yet.
4. Create the backlog plan document early, after the first goal summary is
   available, so planning work is retained as it evolves. The initial document
   should use the active workflow `plan.md` template when available and a
   status that clearly means plan creation, review, and approval are not
   complete yet, such as `📝 Planning Draft`. Treat template comments marked
   `DO NOT INCLUDE IN OUTPUT` as agent-only instructions; never copy those
   comments into the project-owned plan.
5. Use the plan document as the living planning record. Keep it current as the
   goal, design intent, questions, phases, tasks, risks, verification, lessons,
   and promotion notes evolve. Do not fill every template section
   speculatively. When a later section is not accepted yet, leave it clearly
   pending rather than drafting work against unstable intent.
6. Run the vision gate first. Relentlessly clarify the high-level goal until
   both the agent and user agree on the product intent. Focus this stage on
   the "what" and "why"; avoid prematurely committing to the "how" unless it
   constrains the goal. Use `product-strategist` for a bounded vision pass when
   that role is installed and product strategy would materially improve the
   plan.
7. Record acceptance on the `High-Level Goal` heading only after the user
   agrees that the vision, audience, value, and scope direction are clear
   enough to continue.
8. After the high-level goal is accepted, run the design-intent gate. Translate
   the accepted goal into design intentions that describe the intended
   implementation shape, tradeoffs, boundaries, interfaces, data and safety
   posture, verification needs, rollout considerations, non-goals, and open
   decisions. Use `requirements-engineer` for a bounded requirements pass
   when requirements, actors, workflows, inputs, outputs, constraints,
   non-goals, boundaries, acceptance signals, open decisions, or
   plan-readiness judgment need specialist review. Use `product-designer` for
   a bounded design pass when the plan touches user flows, interaction design,
   accessibility, layout hierarchy, prototypes, terminal UX, prompts, or
   design-system fit. Use `technical-architect` for a bounded architecture
   pass when the plan touches
   system boundaries, component contracts, integration choices, runtime
   contracts, persistence, data flow, package-management behavior, workflow
   lifecycle behavior, or maintainability tradeoffs. Use `security-engineer`
   for a bounded security pass when the plan touches trust boundaries,
   credentials, authorization, permissions, destructive file operations,
   dependencies, network or external systems, package trust, source resolution,
   lockfile integrity, or other safety-sensitive behavior.
   Use `ux-writer` for a bounded copy pass when the plan changes labels,
   prompts, command help, terminal output, errors, empty states, onboarding
   copy, README language, workflow instructions, or other product or
   developer-facing text.
   Use `quality-engineer` for a bounded quality pass after Design Intent is
   accepted when acceptance checks, verification strategy, regression risk,
   manual validation, evidence expectations, or validation gaps need
   specialist review.
   Use `documentation-specialist` for a bounded documentation pass when the
   plan changes durable behavior, `_docs` placement, design-promotion needs,
   current-state docs, README or workflow docs, index links, or closeout
   expectations.
9. Iterate on design intent until the user explicitly agrees that it captures
   the desired direction. Do not generate implementation phases or task lists
   before Design Intent is accepted.
10. Only after Design Intent is accepted, break it into ordered implementation
   phases with concrete tasks. Prefer phases that support iterative
   development, verification, and review over one large all-or-nothing phase.
   Use `technical-architect` for phase-shaping guidance when architecture
   boundaries, component responsibilities, runtime contracts, or integration
   sequencing materially affect task order.
   Use `quality-engineer` for phase verification guidance when targeted
   checks, regression coverage, manual validation, skipped-check rationale, or
   acceptance evidence materially affect task order or phase success criteria.
   Use `documentation-specialist` for phase documentation guidance when
   documentation tasks, promotion notes, current-state accuracy checks, or
   closeout docs expectations materially affect task order or phase success
   criteria.
   Use `implementation-engineer` for phase and task decomposition when scoped
   task boundaries, likely changed areas, dependencies, execution sequencing,
   test ownership, documentation impact, or verification handoff materially
   affect whether the work is ready for activation and later execution.
11. Apply the task status markers from `.agents/workflow.md` to every phased
   task list. New backlog tasks should start with `⬜️`; use `🟨`, `✅`, and
   `⚠️` only when the plan is recording actual execution state or a known
   validation gap.
12. Lead the user through a phase-by-phase review. For each phase, ask for
   sign-off or requested changes before treating that phase as accepted.
13. As each gate is accepted, record that acceptance inline on the relevant
   section or phase heading, such as
   `## Design Intent (status: accepted)` or
   `### Phase 1: Name (status: accepted)`.
14. Once all phases and tasks are accepted, update the plan status to indicate
   the backlog plan is ready for later activation, such as `💤 Backlog`. Do not
   leave a detached review-gates section in the final accepted plan.
15. Place every newly created implementation plan in `_docs/plans/backlog/`.
   Moving a plan to `_docs/plans/` requires a later explicit `plan-activate`
   request from the user.

## Planning Gates

Require explicit user agreement before moving past these gates:

- Vision gate: `Context` and `High-Level Goal` are clear enough to continue.
- High-level goal agreed.
- Requirements and Design Intent agreed.
- Each implementation phase and its tasks agreed.
- Final backlog plan accepted.

If the user changes an earlier decision, update the living plan and revisit any
later sections affected by that change.

## Living Plan Shape

Use the active workflow `plan.md` template when available. Otherwise use the
repository's existing plan style, and include sections that preserve unfinished
planning work without pretending it is final:

- `Status`: use `📝 Planning Draft` until final plan acceptance, then `💤 Backlog`.
- `Context`: current understanding, relevant docs reviewed, and why the work
  matters.
- `High-Level Goal`: the agreed "what" and "why".
- `Design Intent`: the accepted implementation direction and boundaries.
- `Non-Goals` and `Boundaries And Invariants` when they materially reduce
  ambiguity or risk.
- `Implementation Phases`: before Design Intent is accepted, keep this section
  as a clear placeholder such as `Not drafted until Design Intent is accepted`.
  After Design Intent is accepted, replace the placeholder with ordered phases
  containing concrete tasks, success goals, and verification. Use the workflow
  task status markers directly in task lists: `⬜️` not started, `🟨` in
  progress, `✅` completed, and `⚠️` implemented or substantially complete with
  a known validation gap or follow-up risk.
- `Open Questions / Decisions`: unresolved questions, deferred "wait and see"
  decisions, and the point in execution when each must be revisited.
- `Risks`: especially data-safety, credentials, file operations,
  external-system, publishing, persistence, runtime-contract, and rollout risks.
- `Security Review`: planned or completed security-review evidence for
  security-sensitive work. During planning, record expected review scope or
  intentionally deferred questions. During closeout, record post-phase
  findings, blocking issues converted to normal plan tasks, and residual risk.
- `Documentation Impact`: classify expected current-state knowledge impact by
  product, requirements, architecture, security, quality, operations,
  decisions, and glossary. Record when no `_docs/kb` update is expected and
  why.
- `Product Readiness`: when work moves toward user-facing release, classify the
  expected readiness as prototype-ready, internal-use-ready, beta-ready, or
  production-ready, with the evidence needed to support that claim.
- `Lessons To Carry Forward` and `Promotion To Design` when relevant.
- `Completion Checklist`: always include this required section from the active
  `plan.md` template. Keep items pending until closeout; do not omit the
  section just because the plan is still in draft or backlog review.

Resolve `plan.md` from `.agents/templates/plan.md` first, then from the active
workflow origin under `.agents/packages/workflows/<source>/<workflow>/templates/`.
If neither exists, continue with the structure above and report the missing
template. When using a template manually instead of a renderer, strip every
`DO NOT INCLUDE IN OUTPUT` comment block from the created or updated plan.
Before treating the plan as ready, compare it against the required template
sections and repair missing required sections, especially `Completion
Checklist`.

For accepted backlog plans, place acceptance state in the section and phase
headings, for example:

```text
## High-Level Goal (status: accepted)
## Design Intent (status: accepted)
### Phase 1: CLI foundation (status: accepted)
```

Do not use a final `Review Gates` section as the lasting acceptance record.

## Guardrails

- Keep user intent and accepted design decisions separate from implementation
  history.
- Do not leave agent-only template comments, including `DO NOT INCLUDE IN
  OUTPUT` blocks, in project-owned plans.
- Do not use Markdown task checkboxes such as `- [ ]` or `- [x]` for plan
  tasks. Use the status markers from `.agents/workflow.md` so task state is
  visible and consistent across backlog and active plans.
- Do not create active plans directly. Backlog review is the required pause
  before implementation authorization.
- Do not generate implementation phases or task lists against unaccepted Design
  Intent. Record placeholders and open questions instead.
- Do not invent material behavior when the request or repository context is
  insufficient.
- Identify data-safety, credentials, external-system, publishing, persistence,
  and runtime-contract risks before implementation is authorized.
- Questions should earn their keep: ask about product intent, scope,
  architecture, safety, interfaces, verification, or rollout. Avoid trivia, but
  keep asking when an answer is needed to produce a decision-complete plan.
- Open questions may remain in the final backlog plan only when they are
  intentionally deferred and the plan states when they must be resolved.
