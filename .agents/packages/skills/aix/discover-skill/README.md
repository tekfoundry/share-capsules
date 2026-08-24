# discover-skill

## Skill Summary

Finds installable software-development agent skills from a natural-language
request. It helps an agent search configured skill sources and reviewed source
hints, inspect candidate `SKILL.md` files, summarize credible matches, and
route installation through normal `aix` commands only after explicit user
approval.

Installation:

```bash
aix init
```

`aix init` activates `discover-skill` by default as a standalone bundled skill.
In an existing AI Extensions project with the default `aix` skill source
configured, it can also be activated directly:

```bash
aix skill activate aix/discover-skill
```

Dependencies:

- `AGENTS.md`
- Project `aix` configuration, when present
- `known-sources.json`
- `aix skills add`
- `aix skill activate`
- GitHub or internet search access, only when the user agrees to broaden
  beyond configured and known sources

## How to use it

Here are example prompts that invoke this skill:

- "Use discover-skill to find a skill for accessibility-focused code reviews."
- "Find an installable skill for TDD."
- "I need a skill that helps with secure code review."

The skill presents numbered candidates and a quit option. To start install
review, reply with an explicit selection such as:

```text
install 1
```

That does not install the skill. It asks the agent to show the files to
review, an initial assessment, unsafe-flag notes, and the exact `aix` commands
that would run. To approve the commands, reply with:

```text
confirm install 1
```

### Maintaining `known-sources.json`

`known-sources.json` is a simple list of GitHub tree URLs that point to skill
source directories.

The entries are discovery hints. They are not a registry, lockfile, trust
guarantee, endorsement, or install record. Adding a URL here only gives the
`discover-skill` workflow another source to search. If no credible match is
found in configured or known sources, the skill asks before broadening to
unreviewed GitHub or web results.

Keep the file easy to edit:

```json
[
  "https://github.com/example/skills/tree/main/skills"
]
```

Before adding a source, review it as untrusted instructions:

- confirm it contains multiple software-development-relevant skills
- inspect representative `SKILL.md` files and any referenced scripts
- flag skills that ask for secrets, destructive actions, broad system access,
  credential handling, unclear external actions, or production changes
- add only URLs approved by a human reviewer

Do not add install metadata, scores, review notes, or trust labels to
`known-sources.json`. Keep those in plan history or review notes unless a later
feature designs a real metadata format.

## When it is used

Use this skill when the developer wants to discover, compare, or install an
agent skill for software-development work but does not already know the source
URL and skill path.

It is especially useful for requests like "find a skill for accessibility
reviews" or "find a TypeScript development skill." It should avoid office
productivity, personal automation, marketing, therapy-adjacent, or
single-vendor candidates unless the developer explicitly asks for that domain
or technology.

## What it does

The skill clarifies broad or risky requests, searches configured sources first,
then checks `known-sources.json`. It asks before broadening to unreviewed
GitHub or internet results.

For each credible candidate, it confirms that `SKILL.md` is inspectable,
determines the source root and skill path, summarizes the match, links to the
files the developer should review, records source trust status, and flags
unsafe-looking instructions. It rejects weak, uninspectable, or obviously risky
matches instead of padding the list.

The skill displays up to five candidates, asks the developer to reply with
`install #` to start install review, then waits for `confirm install #` before
running anything. Installation stays routed through `aix skills add` and
`aix skill activate`; the skill must not write `aix.json`, `aix.lock.json`,
`.agents/`, `.agents/packages`, or `.agents/skills` directly.
