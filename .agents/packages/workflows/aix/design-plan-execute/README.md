![Design, Plan, Execute workflow overview](https://raw.githubusercontent.com/tekfoundry/ai-extensions/master/assets/design_plan_execute_about.png)

# Design, Plan, Execute

`design-plan-execute` is an `aix` workflow for development teams that want to
use AI agents to ship high-quality, maintainable code. It gives organizations a
way to standardize agent-assisted development across teams and projects.

Teams use the workflow to keep agent work grounded in design intent, small
plans, verified changes, and project documentation that stays current with the
code.

## Quick Start

`design-plan-execute` is installed by default when you initialize a project
with `aix`:

```bash
aix init
```

Use a direct workflow install when a project was not initialized with the
default workflow, or when you need to install it from a specific source:

```bash
aix workflow install https://github.com/tekfoundry/ai-extensions/tree/master/aix/workflows/design-plan-execute aix
```

Check whether your installed workflow has pending upstream changes:

```bash
aix workflow diff
```

Update the active workflow after reviewing the diff:

```bash
aix workflow update
```

To refresh both the active workflow and locked standalone skills, use the
workspace-level update command. It also lists any missing skills from the
built-in `aix` source after the update:

```bash
aix update
```

Check workspace health and installed workflow state:

```bash
aix status
aix verify
```

After initialization or workflow installation, `aix` updates the project:

1. `AGENTS.md` gets a managed block marked
   `aix:workflow design-plan-execute`.
2. `.agents/` gets the workflow router, lifecycle rules, engineering guidance,
   and workflow skills. These are reusable process files for agent-assisted
   development.
3. The workflow installs the reusable files listed in
   [Included Files](#included-files).
4. `_docs/` gets the standard project documentation structure when directories
   are missing. These files belong to the project:
   - `_docs/design/` holds stable design intent for the current accepted
     system.
   - `_docs/plans/` holds active in-progress implementation plans.
   - `_docs/plans/backlog/` holds planned but intentionally not started work.
   - `_docs/plans/completed/` holds archived plans after completion and design
     promotion.

Developers usually do not create or maintain those plan files by hand. The
agent creates and updates them while following the developer workflow below.

Existing project-owned documentation is preserved. Routine workflow updates do
not rewrite project documents.

## Installed Roles

This workflow installs these roles:

| Role name | Example prompts | What it does |
| --- | --- | --- |
| [`product-strategist`](roles/project-dev/product-strategist.md) | "Use product-strategist to review this feature idea."<br>"Should this idea become a plan, or should we narrow it first?"<br>"Compare these feature ideas by user value and sequencing." | Generates and evaluates product ideas, audience fit, scope, tradeoffs, and sequencing before planned work is accepted. |
| [`product-designer`](roles/project-dev/product-designer.md) | "Use product-designer to review this workflow."<br>"Review this plan's user flow and accessibility before implementation."<br>"Does this prompt flow have clear states, recovery paths, and layout hierarchy?" | Reviews user flows, interaction design, accessibility, layout hierarchy, prototypes, terminal UX, and design-system fit before product-facing work is finalized. |
| [`requirements-engineer`](roles/project-dev/requirements-engineer.md) | "Use requirements-engineer to refine this Design Intent."<br>"Are the requirements, non-goals, and acceptance signals ready?"<br>"Find open decisions before we draft phases." | Turns accepted product vision into requirements, non-goals, boundaries, acceptance signals, and plan-readiness evidence before implementation phases are drafted. |
| [`technical-architect`](roles/project-dev/technical-architect.md) | "Use technical-architect to review this plan."<br>"Do these module boundaries and runtime contracts look ready for implementation?"<br>"Split this design into maintainable implementation phases." | Reviews system design, component boundaries, runtime contracts, integration choices, and maintainability tradeoffs before implementation phases are finalized. |
| [`security-reviewer`](roles/project-dev/security-reviewer.md) | "Use security-reviewer to review this plan."<br>"Do these install and update safeguards cover local drift and trust boundaries?"<br>"Review the security risks before closeout." | Reviews trust boundaries, secrets, authorization, destructive operations, dependency risk, and safety-sensitive behavior before implementation or closeout. |
| [`ux-writer`](roles/project-dev/ux-writer.md) | "Use ux-writer to review this command output."<br>"Check this plan's labels, errors, empty states, and README copy."<br>"Does this onboarding text tell users what to do next?" | Reviews labels, prompts, errors, empty states, onboarding copy, README language, and developer-facing text before release. |
| [`quality-engineer`](roles/project-dev/quality-engineer.md) | "Use quality-engineer to plan verification."<br>"Check this phase for regression risk and validation gaps."<br>"Do these checks prove the acceptance criteria?" | Reviews verification strategy, regression risk, acceptance evidence, gaps, and residual risk before implementation phases or closeout are treated as complete. |
| [`documentation-specialist`](roles/project-dev/documentation-specialist.md) | "Use documentation-specialist for this docs impact review."<br>"Where should this current-state behavior be documented?"<br>"Does the implementation match the design docs and active plan?" | Reviews documentation impact, `_docs` placement, design promotion needs, current-state accuracy, implementation-to-intent drift, links, and developer-facing documentation before planning or closeout treats docs as current. |
| [`implementation-engineer`](roles/project-dev/implementation-engineer.md) | "Use implementation-engineer to split this phase into tasks."<br>"Check whether this task is ready for task-execute."<br>"What files, tests, docs, and risks should this implementation touch?" | Reviews implementation task boundaries, sequencing, likely changed areas, code-change readiness, verification handoff, documentation impact, and residual risk before planned work moves into or through execution. |

The workflow activates these roles under `.agents/roles/`. Remove or update the
workflow to change them. Do not deactivate them like normal root roles.

Use roles explicitly when you want bounded specialist judgment, for example
`Use quality-engineer to plan verification` or
`Delegate to documentation-specialist for docs impact`. The
`delegate-to-role` skill resolves named role intent, stops on missing or
ambiguous role requests, and keeps implicit routing conservative. When the host
does not provide a clear bounded subagent handoff, delegation uses a
prompt-overlay fallback.

The parent context remains authoritative for plan state, worktree safety,
verification review, final decisions, and user-facing reporting. The
`.agents/roles/` directory is AIX-managed role storage for this workflow, not a
claim that every host runtime treats it as a native agent directory. Host-native
agent exposure is deferred until an explicit integration command or
configuration owns that compatibility output.

## Installed Skills

This workflow installs these skills:

| Skill name | Example prompts | What it does |
| --- | --- | --- |
| [`project-init`](skills/project-init/README.md) | "Initialize project."<br>"Bootstrap project docs." | Creates or repairs the project-owned `_docs` structure without overwriting existing project-owned content. |
| [`brainstorming-skill`](skills/brainstorming-skill/README.md) | "Use brainstorming-skill. Let's brainstorm."<br>"Brainstorm new workflow ideas."<br>"Review our ideas and help prioritize what should come next." | Runs project-grounded idea discovery before implementation planning, maintains `_docs/ideas.md`, and routes mature ideas toward `plan-create`. |
| [`design-create`](skills/design-create/README.md) | "Use design-create for this feature."<br>"Create a stable design doc for workflow install." | Creates a focused stable design document in the right `_docs/design` area, using the workflow template and index links. |
| [`plan-create`](skills/plan-create/README.md) | "Use plan-create to plan saved search filters."<br>"Create a plan for workflow update diff previews." | Turns an idea into a backlog implementation plan through gated vision, design-intent, phase, and task review. |
| [`plan-review`](skills/plan-review/README.md) | "Use plan-review on this backlog plan."<br>"Review this plan before activation." | Reviews an implementation plan for scope, authorization, design completeness, risks, and verification readiness without implementing it. |
| [`plan-activate`](skills/plan-activate/README.md) | "Use plan-activate on this backlog plan."<br>"Activate the approved plan." | Moves a human-authorized backlog plan into active implementation without changing its intended scope. |
| [`plan-update`](skills/plan-update/README.md) | "Use plan-update to revise this plan."<br>"Record this risk in the active plan." | Updates an active or backlog implementation plan without executing it or changing lifecycle boundaries. |
| [`plan-execute`](skills/plan-execute/README.md) | "Use plan-execute on this active plan."<br>"Continue the current implementation plan." | Orchestrates execution of an active implementation plan across phases while preserving plan continuity and verification evidence. |
| [`phase-execute`](skills/phase-execute/README.md) | "Use phase-execute for Phase 3."<br>"Complete as much of the current phase as possible." | Executes one active-plan phase through bounded task work and records phase-level evidence, risks, and gaps. |
| [`task-execute`](skills/task-execute/README.md) | "Use task-execute for the next task."<br>"Implement this active-plan task." | Implements one concrete task from an active plan, or one approved micro-fix, with targeted verification and plan updates. |
| [`work-verify`](skills/work-verify/README.md) | "Use work-verify on this change."<br>"Verify the current phase." | Selects and runs targeted verification for a change, then reports evidence, gaps, and whether success criteria are satisfied. |
| [`code-review-refactor`](skills/code-review-refactor/README.md) | "Use code-review-refactor."<br>"Review these changes for maintainability risks." | Reviews project code for maintainability risks and routes substantial refactors through developer-approved planning. |
| [`delegate-to-role`](skills/delegate-to-role/README.md) | "Use quality-engineer."<br>"Delegate to documentation-specialist." | Selects an installed project role and prepares bounded delegation while preserving parent-context ownership. |
| [`plan-defer`](skills/plan-defer/README.md) | "Use plan-defer for this active plan."<br>"Move this work back to backlog." | Moves planned work out of active implementation and back into backlog while preserving status and future activation context. |
| [`plan-complete`](skills/plan-complete/README.md) | "Use plan-complete."<br>"Complete and archive this plan." | Closes an implementation plan after tasks, verification, human validation, design promotion, risks, and documentation impact are resolved or recorded. |
| [`design-promote`](skills/design-promote/README.md) | "Use design-promote for this completed plan."<br>"Promote accepted behavior into design docs." | Transfers accepted durable behavior from completed implementation plans into stable design documentation. |
| [`documentation-review`](skills/documentation-review/README.md) | "Use documentation-review."<br>"Check the docs after this phase." | Reviews documentation structure, formatting, links, maintainability, and current-state accuracy; fixes issues or records follow-up work. |

The workflow activates these skills under `.agents/skills/`. Remove or update
the workflow to change them. Do not deactivate them like normal root skills.

## Installed Templates

This workflow owns default templates for shared lifecycle artifacts under
`templates/`. They define the shape of the Markdown artifacts agents create
while following the workflow.

Templates have two layers:

- Document templates are top-level Markdown files such as `plan.md` and
  `design-doc.md`. They define complete workflow artifacts.
- Section templates are reusable Markdown fragments under `templates/sections/`.
  Document templates can include them directly, or repeat them for lists such as
  implementation phases and tasks.

For example, the plan document template includes shared sections for reviewed
context, risks, and the completion checklist. It repeats the phase section
template for each implementation phase.

The current document templates are:

- `competitive-analysis`
- `design-doc`
- `design-readme`
- `docs-readme`
- `plan`
- `product-summary`

The current section templates are:

- `sections/completion-checklist`
- `sections/execution-note`
- `sections/phase`
- `sections/promotion-to-design`
- `sections/reviewed-context`
- `sections/risks`
- `sections/security-review`
- `sections/task`
- `sections/verification`

The default plan template includes reusable security-review and completion
checklist sections. Those sections make closeout work visible in the plan,
while the `plan-complete` skill still enforces completion requirements if the
local plan template was edited.

Projects can publish editable copies with `aix templates publish` after the
workflow is installed. Published copies belong under `.agents/templates/` and
are local project overrides; workflow updates continue to manage the origin
templates inside the workflow package.

```bash
aix templates list
aix templates publish
aix templates diff
aix templates diff sections/verification
aix templates reset plan
aix templates reset --all
```

`aix templates list` shows each template, whether it is a document or section,
and whether the active version is the workflow origin or a published override.
`aix templates publish` publishes the complete active workflow template set.
It refuses targeted publish arguments because partial publishing can make a
workflow harder to reason about.

Template resolution is published-first:

1. Use `.agents/templates/<template-name>.md` when it exists.
2. Otherwise use the active workflow origin under
   `.agents/packages/workflows/<source>/<workflow>/templates/<template-name>.md`.

Section templates follow the same rule under `sections/`. For example, an
agent looks for `.agents/templates/sections/verification.md` before falling
back to the workflow origin.

Use `aix templates diff` to review local template changes against the workflow
origin. Use `aix templates reset <template-name>` to remove one published
override, or `aix templates reset --all` to remove every published override
owned by this workflow. Reset deletes the local override and lets normal
resolution fall back to the origin; it does not rewrite local files with origin
contents.

This gives teams full control over workflow artifact output without forking
the workflow. Keep the skill instructions in the workflow package, and use
published templates for the shape, headings, required sections, and boilerplate
inside generated docs.

## Developer Workflow

To use the workflow, modify your prompt to name the skill you want the agent to
run, such as `use plan-create`. That is the safest and most repeatable form.
Natural prompts like "let's create a plan for this" often work too, but naming
the skill removes guesswork.

### Core Prompts

Most planned work follows this order:

1. Create a plan with `plan-create`.
2. Activate the plan with `plan-activate`.
3. Execute the plan with `plan-execute`, `phase-execute`, or `task-execute`.
4. Complete the plan with `plan-complete`.

For a complete approved backlog plan example, see
[Plan example](plan-example.md).

#### 1. Create a plan

Use `plan-create` when you have an idea that needs design work before the team
starts changing code.

<table>
<tr>
<th align="left" width="45%">Typical prompts</th>
<th align="left">What happens next</th>
</tr>
<tr>
<td>
<blockquote>
<p>Use plan-create to turn this idea into an implementation plan: add saved search filters so users can reuse common searches.</p>
</blockquote>
<blockquote>
<p>Create a plan for a new saved search feature that lets users reuse common searches.</p>
</blockquote>
<blockquote>
<p>Help me create a new plan.</p>
</blockquote>
</td>
<td>
The agent reads repository instructions, relevant design docs, related plans,
and the current worktree. If the goal is not clear yet, it asks discovery
questions. Then it creates a living plan under <code>_docs/plans/backlog/</code>
and works with you through the main planning gates: goal, design intent,
implementation phases, and final backlog acceptance.
See the example plan's <a href="plan-example.md#context">context</a>,
<a href="plan-example.md#high-level-goal-status-accepted">goal</a>,
<a href="plan-example.md#design-intent-status-accepted">design intent</a>, and
<a href="plan-example.md#implementation-phases">implementation phases</a>.
</td>
</tr>
</table>

Plan creation stops at an approved backlog plan. It does not authorize
implementation.

> [!WARNING]
> **Plan quality matters:** Spend real time on this step. The more clearly the
> plan captures design intent and organizes phases and tasks, the more
> direction the agent has when it starts building. A thin plan leaves too much
> for the agent to infer later.

#### 2. Activate the plan

Use `plan-activate` when a backlog plan is approved and ready for
implementation.

<table>
<tr>
<th align="left" width="45%">Typical prompts</th>
<th align="left">What happens next</th>
</tr>
<tr>
<td>
<blockquote>
<p>Use plan-activate on <code>_docs/plans/backlog/saved-search-filters.md</code>.</p>
</blockquote>
<blockquote>
<p>Activate the saved search filters plan.</p>
</blockquote>
</td>
<td>
The agent treats activation as a human-controlled boundary. If the backlog plan
is ready, it moves the plan from <code>_docs/plans/backlog/</code> to
<code>_docs/plans/</code>, records the activation, verifies that no duplicate
backlog copy remains, and reports readiness notes.
See the example plan's <a href="plan-example.md#status">status</a> and
<a href="plan-example.md#implementation-phases">accepted phases</a>.
</td>
</tr>
</table>

Activation makes a plan eligible for implementation. It does not start coding
unless you ask for execution too.

#### 3. Execute the plan

Choose the execution prompt based on how much control you want. `plan-execute`
runs the broadest slice. `phase-execute` stays inside one phase. `task-execute`
is the tightest option.

<table>
<tr>
<th align="left" width="45%">Typical prompts</th>
<th align="left">What happens next</th>
</tr>
<tr>
<td>
<blockquote>
<p>Use plan-execute on <code>_docs/plans/saved-search-filters.md</code>.</p>
</blockquote>
<blockquote>
<p>Use phase-execute on Phase 2 in <code>_docs/plans/saved-search-filters.md</code>.</p>
</blockquote>
<blockquote>
<p>Use task-execute for the "persist saved search filters" task in <code>_docs/plans/saved-search-filters.md</code>.</p>
</blockquote>
<blockquote>
<p>Execute the next task.</p>
</blockquote>
<blockquote>
<p>Continue the current phase.</p>
</blockquote>
<blockquote>
<p>Keep going on the active plan.</p>
</blockquote>
</td>
<td>
The agent reads the active plan, selects the requested scope, updates plan
status, makes the code and documentation changes, runs targeted verification,
and reports files changed, checks run, documentation impact, and any remaining
risk.

Depending on the task, phase, or plan, execution may create or update:
<ul>
<li>implementation code, tests, fixtures, command output, and generated assets</li>
<li>automated test coverage, including targeted regression tests for the changed behavior</li>
<li>documentation, help text, README examples, design docs, and release notes</li>
<li>project state files such as manifests, lockfiles, package files, or active skill/workflow links</li>
<li>the active plan's task status, completion evidence, verification notes, risk notes, validation gaps, and follow-up work</li>
<li>verification results from targeted checks, type checks, builds, full test runs, package smoke checks, stale-syntax scans, and <code>git diff --check</code></li>
<li>maintainability review notes, including file-size scans and refactor decisions when a review task requires them</li>
</ul>

See the example plan's <a href="plan-example.md#implementation-phases">phases
and tasks</a>, <a href="plan-example.md#risks">risks</a>, and
<a href="plan-example.md#promotion-to-design">promotion notes</a>.
</td>
</tr>
</table>

Execution should stay as small as the work allows. Use `task-execute` when you
want tight control over scope.

#### 4. Complete the plan

Use `plan-complete` when the implementation is done and you want to close the
record properly.

<table>
<tr>
<th align="left" width="45%">Typical prompts</th>
<th align="left">What happens next</th>
</tr>
<tr>
<td>
<blockquote>
<p>Use plan-complete on <code>_docs/plans/saved-search-filters.md</code>.</p>
</blockquote>
<blockquote>
<p>Complete and archive the saved search filters plan.</p>
</blockquote>
</td>
<td>
The agent confirms tasks, success goals, verification, documentation impact,
and risks. It promotes accepted behavior into <code>_docs/design/</code>
through <code>design-promote</code>, reviews documentation structure,
formatting, and links through <code>documentation-review</code>, records final
evidence and follow-up work, then archives the completed plan under
<code>_docs/plans/completed/</code> with a dated filename.
See the example plan's <a href="plan-example.md#phase-5-review-documentation-and-release-readiness-status-accepted">release-readiness phase</a>,
<a href="plan-example.md#risks">risks</a>, and
<a href="plan-example.md#promotion-to-design">promotion notes</a>.
</td>
</tr>
</table>

Completion only happens after the plan, verification, risks, and design docs
are in order.

> [!NOTE]
> **Completed plans are history.** During plan completion, the design intent
> that is now true in the codebase is promoted into `_docs/design/`. That
> directory holds the current design state of the application as a whole. The
> design intent inside completed plan files is not kept current and may become
> stale as later plans change the system. Treat `_docs/plans/completed/` as the
> dated execution history: the incremental state changes each plan made at the
> time it was completed.

### Other Prompts

These prompts are useful, but they are not required for every plan. Use them
when the project needs that specific action.

<table>
<tr>
<th align="left" width="45%">Typical prompts</th>
<th align="left">What happens next</th>
</tr>
<tr>
<td>
<blockquote>
<p>Please review <code>_docs/plans/backlog/saved-search-filters.md</code> and tell me if it is ready to activate.</p>
</blockquote>
<blockquote>
<p>Use plan-review to find gaps in the saved search filters plan before we start it.</p>
</blockquote>
</td>
<td>
The agent checks whether the plan is ready to activate. Review does not
activate or implement backlog work.
See the example plan's <a href="plan-example.md#open-questions-decisions">open
questions</a>, <a href="plan-example.md#risks">risks</a>, and
<a href="plan-example.md#implementation-phases">accepted phases</a>.
</td>
</tr>
<tr>
<td>
<blockquote>
<p>Update <code>_docs/plans/saved-search-filters.md</code> with a rollout-risk note.</p>
</blockquote>
<blockquote>
<p>Add tasks for keyboard shortcuts to Phase 2 of the saved search filters plan.</p>
</blockquote>
<blockquote>
<p>Insert a new accessibility review phase before release readiness.</p>
</blockquote>
</td>
<td>
The agent makes a plan-only edit. It may add risks, clarify scope, add tasks to
an existing phase, or insert a new phase. It keeps task status markers
consistent and does not write code or move the plan between backlog, active,
and completed states. Plan updates usually touch sections like
<a href="plan-example.md#open-questions-decisions">open questions</a>,
<a href="plan-example.md#risks">risks</a>,
<a href="plan-example.md#implementation-phases">implementation phases</a>, or
<a href="plan-example.md#lessons-to-carry-forward">lessons</a>.
</td>
</tr>
<tr>
<td>
<blockquote>
<p>Let's start a code review.</p>
</blockquote>
<blockquote>
<p>Use code-review-refactor to review the workflow install code for maintainability risks.</p>
</blockquote>
<blockquote>
<p>Review the CLI command layer and recommend safe refactors.</p>
</blockquote>
</td>
<td>
The agent reads repository instructions, <code>.agents/engineering-best-practices.md</code>,
relevant design docs, and the current worktree. It inspects the requested code
against the workflow's engineering guidance, reports findings first, then asks
which findings you want to refactor.

Small behavior-preserving fixes can proceed inline after confirmation. Larger
or cross-cutting refactors are routed into a backlog plan with
<code>plan-create</code> so the work can move through normal review,
activation, execution, and completion.
</td>
</tr>
<tr>
<td>
<blockquote>
<p>Verify the saved search filter changes before we continue.</p>
</blockquote>
<blockquote>
<p>Use work-verify to check whether the current phase meets its success criteria.</p>
</blockquote>
</td>
<td>
The agent runs targeted checks first, adds broader repository checks when the
change needs them, and reports verification results and remaining risks.
See the verification notes inside the example plan's
<a href="plan-example.md#implementation-phases">implementation phases</a>.
</td>
</tr>
<tr>
<td>
<blockquote>
<p>Pause <code>_docs/plans/saved-search-filters.md</code> and move it back to the backlog.</p>
</blockquote>
<blockquote>
<p>Use plan-defer to record what is unfinished before we stop this work.</p>
</blockquote>
</td>
<td>
The agent records unfinished work and moves the active plan back to
<code>_docs/plans/backlog/</code>.
See the example plan's <a href="plan-example.md#status">status</a>,
<a href="plan-example.md#risks">risks</a>, and
<a href="plan-example.md#open-questions-decisions">open questions</a>.
</td>
</tr>
<tr>
<td>
<blockquote>
<p>Promote the accepted saved search behavior from the completed plan into the design docs.</p>
</blockquote>
<blockquote>
<p>Use design-promote to update the stable design docs with what is now true.</p>
</blockquote>
</td>
<td>
The agent updates the smallest appropriate design document with behavior that
is now true in the codebase. When a new stable design document is needed, it
uses <code>design-create</code> to choose the right location, apply the
workflow design-doc template, and update index links.
See the example plan's
<a href="plan-example.md#promotion-to-design">promotion notes</a>.
</td>
</tr>
<tr>
<td>
<blockquote>
<p>Set up the project docs structure this workflow expects.</p>
</blockquote>
<blockquote>
<p>Use project-init to create any missing <code>_docs</code> directories.</p>
</blockquote>
</td>
<td>
The agent creates missing <code>_docs</code> directories and documentation
routers without overwriting existing project-owned content.
Plans created later will use sections like the example plan's
<a href="plan-example.md#context">context</a> and
<a href="plan-example.md#implementation-phases">implementation phases</a>.
</td>
</tr>
<tr>
<td>
<blockquote>
<p>This is a micro-fix: update the empty-state copy on the saved searches page.</p>
</blockquote>
<blockquote>
<p>Make this small UI copy fix without creating a plan.</p>
</blockquote>
</td>
<td>
The agent may proceed without a broader plan only when existing design intent
covers the change and the fix is localized.
If the work is larger than a micro-fix, create a plan with sections like the
example plan's <a href="plan-example.md#high-level-goal-status-accepted">goal</a>
and <a href="plan-example.md#design-intent-status-accepted">design intent</a>.
</td>
</tr>
</table>

Use the other prompts as needed. They help when a plan needs review,
maintenance, verification, deferral, documentation, project setup, or a small
fix outside the core flow.

## Included Files

Workflow package files:

- `workflow.json`: installation manifest for the workflow package.
- `AGENTS.append.md`: managed root `AGENTS.md` block content.
- `README.md`: developer-facing overview of the workflow.
- `plan-example.md`: complete example of an approved backlog implementation
  plan.
- `workflow.md`: reusable workflow lifecycle, work classification, planning,
  verification, and completion rules.
- `engineering-best-practices.md`: reusable engineering guidance for
  agent-assisted development.
- `templates/*.md`: default document templates for workflow artifacts.
- `templates/sections/*.md`: reusable section templates used inside document
  templates and lifecycle records.
- `skills/*/SKILL.md`: workflow-owned skill instructions.

Installed workflow docs:

- [Workflow](workflow.md): reusable workflow lifecycle, work classification,
  planning, verification, and completion rules.
- [Plan example](plan-example.md): complete approved backlog plan showing
  typical structure, section depth, task markers, verification, risks, and
  promotion notes.
- [Engineering best practices](engineering-best-practices.md): reusable
  engineering guidance for agent-assisted development.
- [Skills](skills/): reusable workflow skills for plan and task lifecycle work.

Root integration:

- `AGENTS.md` gets a managed block marked
  `aix:workflow design-plan-execute`.
- Existing `AGENTS.md` content outside the managed block remains
  project-owned.

Project documentation:

- `_docs/design/`: stable design intent for the current accepted system.
- `_docs/plans/`: active in-progress implementation plans.
- `_docs/plans/backlog/`: planned but intentionally not started work.
- `_docs/plans/completed/`: archived plans after completion and design
  promotion.
