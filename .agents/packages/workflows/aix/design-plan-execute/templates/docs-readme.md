# Project documentation

This directory contains project-owned documentation for {{ project:name }}.

Use this file as the starting point when you need product intent, current
implemented knowledge, or implementation plan context. Workflow instructions
for agents live under `.agents/`; this directory records what this project is
building and why.

## Start here

- [Knowledge base](kb/README.md): current implemented project knowledge.
- [Active plans](plans/): authorized implementation plans and execution
  records.
- [Backlog plans](plans/backlog/): planned work that has not been activated.
- [Completed plans](plans/completed/): archived implementation records.

## Documentation roles

The knowledge base describes accepted current behavior and architecture.
Update it when implementation changes durable product, requirements,
architecture, security, quality, operations, decisions, or terminology
knowledge.

The plan docs describe work in flight or work reserved for later. Active plans
track task status, verification evidence, risks, and documentation impact until
the work is complete.

The top-level `AGENTS.md` file is the repo-specific entrypoint for coding
agents. The `.agents/` directory contains reusable workflow guidance and
workflow-owned skills. Keep project decisions in `_docs/`, not in packaged
workflow files.
