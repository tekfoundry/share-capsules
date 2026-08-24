# Project documentation

This directory contains project-owned documentation for {{ project:name }}.

Use this file as the starting point when you need product intent, current
design, or implementation plan context. Workflow instructions for agents live
under `.agents/`; this directory records what this project is building and why.

## Start here

- [Design index](design/README.md): stable current design intent.
- [Active plans](plans/): authorized implementation plans and execution
  records.
- [Backlog plans](plans/backlog/): planned work that has not been activated.
- [Completed plans](plans/completed/): archived implementation records.

## Documentation roles

The design docs describe accepted project behavior and architecture. Update
them when implementation changes durable product intent.

The plan docs describe work in flight or work reserved for later. Active plans
track task status, verification evidence, risks, and documentation impact until
the work is complete.

The top-level `AGENTS.md` file is the repo-specific entrypoint for coding
agents. The `.agents/` directory contains reusable workflow guidance and
workflow-owned skills. Keep project decisions in `_docs/`, not in packaged
workflow files.

