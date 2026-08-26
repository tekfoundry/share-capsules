# Workflow External Skill Dependencies

This static example shows the expected structure and level of detail for an
approved backlog plan. It is copied from a real `design-plan-execute` planning
document so developers can inspect concrete plan sections before creating,
reviewing, activating, or executing their own plans.

## Status

💤 Backlog

This backlog plan is fully approved for later activation. It does not authorize
implementation until a later explicit `plan-activate` request.

## Context

The `design-plan-execute` workflow helps developers and agents create
high-quality, maintainable code. It installs process docs under `.agents/`,
manages a root `AGENTS.md` block, and exposes workflow-owned skills under
`.agents/skills/`.

Current knowledge-base docs intentionally deferred external workflow skill dependencies
in `_docs/kb/03-architecture/workflow-lifecycle.md`, noting that workflow-local skills should be
self-contained for the MVP and third-party skills could be documented as
recommendations. At the same time, `_docs/kb/02-requirements/workflows/design-plan-execute/skills.md`,
`_docs/kb/03-architecture/package-management.md`, and the active MVP plan already describe
`aix init` activating `cursor-pstack/unslop` from the `cursor-pstack` source.

This plan resolves that mismatch by making external skill inclusion an explicit
workflow capability instead of a one-off init special case.

Reviewed context:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/workflow.md`
- `_docs/README.md` was expected by the workflow router but does not exist.
- `_docs/kb/README.md`
- `_docs/kb/03-architecture/workflow-lifecycle.md`
- `_docs/kb/02-requirements/workflows/design-plan-execute/skills.md`
- `_docs/kb/03-architecture/package-management.md`
- `_docs/plans/mvp-release.md`
- `aix/workflows/design-plan-execute/workflow.json`
- `aix/workflows/design-plan-execute/README.md`
- `aix/workflows/design-plan-execute/AGENTS.append.md`

## High-Level Goal (status: accepted)

Workflows should be able to declare external skills that are installed and
activated as part of the workflow experience, while preserving the current
safety model for source resolution, lockfile hashes, local drift protection,
and user intent.

The immediate motivating case is that the `design-plan-execute` workflow should
include the `unslop` skill natively, sourced from `cursor-pstack`, without
copying `unslop` into the `aix` workflow's local `skills/` directory.

This matters because some workflow capabilities belong to the workflow's normal
operating model even when the skill itself should stay owned by another source.
The user should get the complete workflow by installing or initializing the
workflow, and `aix` should record exactly where every activated skill came from.

## Design Intent (status: accepted)

Add a small, explicit external-skill declaration to workflow manifests. The
manifest remains an install manifest, not a general dependency system. It
should declare the external skills a workflow needs, the source name to resolve
them from, and the source-relative skill path. The first use should cover
`cursor-pstack/unslop` for `design-plan-execute`.

The manifest syntax change must be backwards compatible. Existing workflow
manifest nodes keep their names and behavior. Existing manifests without the
new nodes remain valid and install with the same behavior they have today. This
work should add optional manifest nodes only; it should not remove, rename, or
change the meaning of existing fields such as `name`, `title`, `agentsMd`,
`docs`, or `skillsDir`.

The workflow manifest should describe the desired end state after workflow
installation, not a procedural script. During install or init, `aix` may use
the same underlying behavior as source-add and skill-activation commands to
reach that state. If a required source is not yet configured, workflow install
may add the source. If a required external skill is not yet active, workflow
install may activate it. Those operations still use the normal safety checks,
validation, lockfile writes, and collision handling.

Workflow install and init should treat declared external skills as
workflow-associated activations. They are required for the workflow experience,
but their package copies remain ordinary skill packages under
`.agents/packages/skills/<source>/...` because the content is owned by the
external skill source, not the workflow package. Their active links still live
under `.agents/skills/<active-name>`.

The manifest should reference only configured or built-in skill sources. It
should not inline arbitrary Git URLs for external skills inside
`workflow.json`. Source definitions remain rooted in `aix.json` and built-in
defaults so source resolution, caching, update checks, and credentials posture
stay consistent.

Lockfile state should distinguish:

- workflow-local skills owned by the workflow package
- user-requested root skills
- dependency-only skills inferred from another skill
- workflow-required external skills declared by the active workflow

Direct deactivation of workflow-required external skills should fail while the
workflow remains active, because removing them would leave the workflow
incomplete. Workflow uninstall should own their cleanup when no remaining
user-requested root skill or inferred dependency still needs them.

`aix verify` and `aix status` should report missing, drifted, or blocked
workflow-required external skills as workflow health issues. `aix workflow
diff` and `aix workflow update` should include the external skill state when
the source can be resolved, without silently overwriting local edits.

Update behavior should be conservative. Updating a workflow may update the set
of declared external skills, but activation, removal, or replacement must pass
the same drift and collision checks as ordinary skill activation and
deactivation. A workflow update that adds a new external skill should stop
before partial writes if the source cannot be resolved or the active name
collides.

## Non-Goals

- No general-purpose plugin package dependency system.
- No registry-backed workflow dependency resolution.
- No transitive workflow dependency graph.
- No automatic activation of arbitrary recommended skills.
- No copying externally owned skills into `aix/workflows/.../skills`.
- No silent removal of an external skill that is also user-requested or still
  required by another active lockfile edge.
- No workflow replacement behavior beyond the existing one-active-workflow MVP
  boundary.

## Boundaries And Invariants

- `.agents/` remains package-managed agent process structure.
- `_docs/` remains project-owned documentation.
- `workflow.json` stays small and declarative.
- Workflow manifest changes are additive and backwards compatible.
- External workflow skills resolve through known skill sources, not inline
  ad-hoc source definitions.
- External skill package copies live under `.agents/packages/skills`.
- Workflow-local skill package copies live under
  `.agents/packages/workflows`.
- Active skills live under `.agents/skills`.
- Local edits must not be overwritten during install, update, uninstall,
  activation, deactivation, verify, or status.
- Natural skill naming and collision rules continue to apply unless an
  explicit alias field is accepted for workflow-required external skills.
- `unslop` remains externally owned by `cursor-pstack`; the `aix` workflow
  declares that it needs it.

## Implementation Phases

### Phase 1: Manifest And Design Contract (status: accepted)

Goal: define the external-skill declaration shape and align stable design docs
before implementation begins.

Tasks:

- ⬜️ Update workflow design docs to replace the deferred external dependency
      note with the accepted external-skill declaration model.
- ⬜️ Define the `workflow.json` field for workflow-required external skills.
- ⬜️ Preserve compatibility with existing workflow manifests by adding optional
      nodes only and leaving existing nodes unchanged.
- ⬜️ Document how `design-plan-execute` declares `cursor-pstack/unslop`.
- ⬜️ Decide whether external workflow skills may declare an alias in the first
      version or must use natural names only.
- ⬜️ Document ownership, lockfile, update, uninstall, status, verify, and drift
      behavior for workflow-required external skills.

Verification:

- Documentation review against `_docs/kb/03-architecture/workflow-lifecycle.md`,
  `_docs/kb/02-requirements/workflows/design-plan-execute/skills.md`, and
  `_docs/kb/03-architecture/package-management.md`.
- Plan review confirms the docs no longer contradict each other about
  `unslop`.

### Phase 2: Schema, Parsing, And Lockfile Modeling (status: accepted)

Goal: teach the domain model to represent workflow-required external skills
without activating anything yet.

Tasks:

- ⬜️ Extend workflow manifest parsing and validation for the accepted
      external-skill field.
- ⬜️ Add tests for valid and invalid external-skill declarations.
- ⬜️ Extend lockfile types and parsing so workflow-required external skills are
      distinguishable from user-requested and dependency-only skills.
- ⬜️ Ensure legacy lockfiles and workflow manifests without external skills
      still parse.
- ⬜️ Add fixtures for `design-plan-execute` declaring `cursor-pstack/unslop`.

Verification:

- Targeted manifest and lockfile tests.
- `npm run typecheck`.

### Phase 3: Workflow Install And Init Activation (status: accepted)

Goal: install declared external skills as part of workflow install/init while
preserving existing activation safety checks.

Tasks:

- ⬜️ Resolve workflow-required external skills from configured or built-in
      skill sources.
- ⬜️ Materialize external skill packages under `.agents/packages/skills`.
- ⬜️ Activate them under `.agents/skills` using existing naming and collision
      rules.
- ⬜️ Record package files, active files, source commit, and workflow-required
      ownership metadata in `aix.lock.json`.
- ⬜️ Replace the special-case `aix init` handling for `cursor-pstack/unslop`
      with workflow manifest-driven activation.
- ⬜️ Ensure install/init stop before writing when an external skill source is
      missing, unresolved, drifted, or colliding.

Verification:

- Command-level tests for `aix init` installing `design-plan-execute` plus
  `cursor-pstack/unslop` from the workflow manifest.
- Workflow install tests for external skill activation.
- Drift and collision tests covering external workflow skills.
- `npm run build`, `npm run typecheck`, and targeted tests.

### Phase 4: Verify, Status, Diff, Update, And Uninstall (status: accepted)

Goal: make the rest of the workflow lifecycle understand declared external
skills.

Tasks:

- ⬜️ Make `aix verify` report missing or drifted workflow-required external
      skills as workflow health failures.
- ⬜️ Make `aix status` show workflow-required external skills separately from
      user-requested root skills and inferred dependencies.
- ⬜️ Include external workflow skills in `aix workflow diff` when comparable
      source state is available.
- ⬜️ Make `aix workflow update` add, update, or remove workflow-required
      external skills only after existing safety checks pass.
- ⬜️ Make `aix workflow uninstall` remove workflow-required external skills
      only when no remaining root skill or dependency edge still needs them.
- ⬜️ Refuse direct `aix skill deactivate <active-name>` for
      workflow-required external skills while their workflow remains active.

Verification:

- Command-level tests for verify, status, diff, update, uninstall, and direct
  deactivate refusal.
- Tests for cleanup when `unslop` is workflow-required only.
- Tests for preserving `unslop` when it is also user-requested or required by
  another active skill.
- `npm test` and `git diff --check`.

### Phase 5: Review, Documentation, And Release Readiness (status: accepted)

Goal: close the implementation with maintainability review and clear user
documentation.

Tasks:

- ⬜️ Run the maintainability review gate for changed production files.
- ⬜️ Update README or command help examples if workflow external skills change
      user-visible behavior.
- ⬜️ Promote accepted behavior into stable design docs after implementation.
- ⬜️ Record verification evidence and any residual risks in the active plan
      before completion.

Verification:

- `npm run build`.
- `npm run typecheck`.
- `npm test`.
- `git diff --check`.
- Documentation review confirms user-facing examples are current.

## Open Questions / Decisions

- Should the first manifest field be named `externalSkills`,
  `requiredSkills`, or something more workflow-specific?
  Resolve during Phase 1 before code changes.
- Should workflow-required external skills support aliases immediately, or
  should the first version require natural skill names only?
  Resolve during Phase 1 because it affects schema and collision behavior.
- Should workflow-required external skills be written to `aix.json` as root
  manifest skills, or represented only in `aix.lock.json` under the active
  workflow?
  Accepted answer: represent them as workflow-derived skill state, because the
  root user intent is the active workflow. Source additions needed to satisfy
  that workflow end state may be reflected in `aix.json` source definitions,
  but the required skills themselves should not become user-requested root
  skills merely because the workflow installed them.
- Should `aix workflow diff` compare external skills against the workflow
  source revision, the external skill source default ref, or the lockfile's
  recorded source ref?
  Resolve before Phase 4 because it affects update semantics.

## Risks

- Dependency semantics could become hard to explain if workflow-required
  external skills, inferred dependencies, and user-requested root skills are
  not named distinctly in status and lockfile output.
- Workflow update can become safety-sensitive if a workflow removes an external
  skill that the user also intentionally activated. The plan must preserve
  user-requested roots.
- Source resolution may require network access during init, install, diff, or
  update. Tests should keep deterministic fixture sources for default runs.
- Active-name collisions could leave a workflow partially installed if
  external skill validation does not happen before writes.
- Treating external workflow skills as general dependencies too early could
  expand the MVP into a broader package dependency system.

## Lessons To Carry Forward

- Workflow-owned process behavior can depend on externally owned skills, but
  ownership and lifecycle must remain visible.
- The source of truth for why a skill is active matters as much as the active
  files themselves.
- `unslop` is the first concrete test case: it should be native to
  `design-plan-execute` without being vendored into that workflow package.

## Promotion To Design

If implemented, promote the accepted behavior into:

- `_docs/kb/03-architecture/workflow-lifecycle.md`
- `_docs/kb/02-requirements/workflows/design-plan-execute/skills.md`
- `_docs/kb/03-architecture/package-management.md`

The promoted docs should describe workflow-required external skills as a
first-class workflow capability and remove the stale statement that external
skill dependencies are deferred.
