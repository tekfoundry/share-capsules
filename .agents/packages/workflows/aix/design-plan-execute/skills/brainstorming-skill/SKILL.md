---
name: brainstorming-skill
description: Run project-grounded brainstorming sessions that produce approved and in-flight ideas in `_docs/ideas.md`.
---

# Brainstorming Skill

Use this skill when the developer wants to discover, compare, refine, or save
possible project ideas before creating an implementation plan.

Typical prompts:

- "Let's brainstorm."
- "Let's brainstorm new skills."
- "Use brainstorming-skill to find possible README improvements."
- "Review our ideas and help prioritize what should come next."

This skill produces high-level ideas. It does not authorize implementation and
does not create, activate, execute, or complete workflow plans. When the
developer chooses one approved idea for implementation planning, route that
idea through `plan-create`.

This skill owns the brainstorming procedure and the `_docs/ideas.md`
checkpoint. Product strategy judgment belongs in a role when the project has
one installed. If `.agents/roles/product-strategist.md` exists and the session
needs vision, audience, value, scope, tradeoff, or sequencing judgment, use
`delegate-to-role` or a bounded prompt-overlay delegation to
`product-strategist`, then fold the returned evidence into the idea list. If
that role is not installed, continue with the standalone procedure below and
ask concise product-vision questions yourself.

## Scope

Brainstorm product, documentation, developer-experience, workflow, testing,
release, marketing, and maintainability ideas that fit the current project.

Marketing-related artifacts are valid brainstorming inputs and outputs. Review
README files, examples, screenshots, install instructions, product pages, and
other docs when they may be stale, unclear, missing new behavior, or undersell
the product.

Stay out of implementation unless the developer separately activates an
implementation plan.

## Session Flow

1. Infer the focus from the developer's prompt.
   - If the prompt has a clear focus, restate it briefly and begin.
   - If the prompt is broad but still usable, treat it as a general project
     brainstorming session.
   - Ask one concise question only when the prompt is too ambiguous to produce
     useful ideas or when safety-sensitive work may be involved.
2. Review the project before generating ideas.
   - Read `AGENTS.md` when present.
   - Read `_docs/README.md` when present, then relevant `_docs/design` docs.
   - Read active and backlog plans that may affect the focus area.
   - Read `_docs/ideas.md` when it exists.
   - Inspect relevant source layout and marketing artifacts such as README
     files when they may reveal gaps or stale messaging.
3. Bring in product strategy when it would improve the session.
   - If `.agents/roles/product-strategist.md` is installed, delegate a bounded
     product-strategy pass for audience, user problem, product value, scope,
     tradeoffs, sequencing, and open questions.
   - Keep the parent brainstorming context responsible for `_docs/ideas.md`,
     approval rules, file edits, and final session output.
   - If the role is unavailable, elicit the same basic vision inputs directly:
     target user, problem, value, scope boundary, urgency, and risk.
   - Do not block a usable brainstorming session solely because the role is
     missing.
4. Research comparable products, projects, tools, or workflows when outside
   context would improve the session.
   - Prefer official docs, repositories, project pages, and primary sources.
   - Keep research bounded. Do enough to identify useful feature patterns,
     gaps, or marketing examples.
   - Keep source links with the ideas they informed.
5. Generate an in-flight idea list.
   - Include useful existing in-flight ideas.
   - Preserve approved ideas unless the developer asks to revisit them.
   - Add new candidates grounded in the project review, product-strategy
     evidence, and research.
6. Checkpoint the session before review.
   - Create or update `_docs/ideas.md` as soon as the first useful in-flight
     list exists.
   - Store new candidates in `In-flight ideas` unless the developer has
     explicitly accepted them as approved.
   - Preserve all existing approved and in-flight ideas unless the developer
     accepts a removal, merge, split, rename, or move.
   - Tell the developer that the in-flight list has been checkpointed.
7. Collaborate with the developer.
   - Review, remove, merge, split, rename, and reprioritize ideas.
   - Move ideas between in-flight and approved sections only when the developer
     accepts that change.
   - Do not silently discard existing ideas.
   - Update `_docs/ideas.md` after meaningful list changes so the session can
     be resumed from another conversation.
8. Approval rules.
   - Do not promote an idea into `Approved prioritized ideas` without explicit
     developer acceptance.
   - Do not delete or collapse ideas without explicit developer acceptance.
   - Preserve extra user-added fields or notes when they do not conflict with
     the requested update.

## Ideas Document

`_docs/ideas.md` is project-owned documentation. Create it with this default
shape when it does not exist:

```md
# Ideas

## Approved prioritized ideas

1. **Idea name**
   - Summary: ...
   - Difficulty: low | medium | high
   - Dependencies: None | Idea name, Idea name
   - Source links:
     - [Label](https://example.com)

## In-flight ideas

1. **Idea name**
   - Summary: ...
   - Difficulty: low | medium | high
   - Dependencies: None | Idea name, Idea name
   - Source links:
     - [Label](https://example.com)
```

The format is the default document shape, not a strict parser contract. If a
project adds fields such as owner, status, dates, or notes, preserve them
unless the developer asks to simplify the file.

Approved ideas go at the top so the durable priority list is easy to scan.
In-flight ideas go at the bottom so unfinished sessions can be resumed later.
The file is the session checkpoint, not a final export. Keep it current during
brainstorming so the developer can walk away at any point.

## Idea Fields

Every idea should include:

- `Name`: short and stable enough to reference from dependencies.
- `Summary`: one or two sentences describing the work and why it matters.
- `Difficulty`: `low`, `medium`, or `high`.
- `Dependencies`: `None` or exact idea names that should happen first.
- `Source links`: links that informed the idea. Use `None` when no links were
  used.

Reference dependencies by exact idea name. Avoid numbering dependencies because
prioritization changes the order.

## Prioritization

Prioritize approved ideas by practical value-to-effort. When a
`product-strategist` delegation was used, base prioritization on that returned
evidence. Otherwise use the lightweight standalone factors below:

1. likely business or developer value
2. implementation difficulty
3. strategic fit with current project direction
4. dependency readiness
5. risk
6. urgency

Use judgment instead of a heavy scoring model. Difficulty stays visible as a
field so high-value hard work is not hidden, but the approved list order should
still favor ideas with the best practical return.

## Source Links

Keep source links attached to the ideas they informed.

Useful links may include:

- official product docs
- GitHub repositories or specific files
- project pages
- competitor pages
- README files or docs in this repository
- issue, plan, or design documents

Use clear labels. A later reader should understand why the source was saved
even if the link title is vague.

## Output During a Session

When showing the working list in chat, group ideas under:

- Approved prioritized ideas
- In-flight ideas

For each idea, include name, summary, difficulty, dependencies, and source
links. Keep the list concise enough for the developer to review and edit.

After generating the first useful in-flight list, write or update
`_docs/ideas.md` before asking the developer to review the list. After that,
update the file whenever the developer accepts meaningful changes. The durable
file should always be good enough for another agent to resume the session.

## Handoff to Planning

When the developer wants to implement an idea, use `plan-create` to turn that
one idea into a backlog implementation plan. Include relevant source links and
dependencies from `_docs/ideas.md` in the plan context.
