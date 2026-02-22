---
name: netnet-agent-core
description: Deterministic operating system for high-reliability execution in the netnet repo. Use when an agent must complete coding or API tasks with strict scope control, machine-readable artifacts, and objective quality gates tied to netnet contract and policy checks.
---

# NetNet Agent Core

## Overview
Use this skill to run any netnet task as a controlled loop: create a work order, execute in bounded scope, verify with acceptance gates, and emit a structured run report.

## Execute Operating Loop
1. Create a work order JSON that follows `references/work_order.schema.json`.
2. Validate the work order before editing.
3. Execute only the requested scope and log changed files.
4. Verify requested acceptance tests plus required netnet gates.
5. Produce a run report JSON that follows `references/run_report.schema.json`.
6. Score the run and drive next iteration from score gaps.

## Enforce NetNet Gates
- Keep objective and constraints explicit and measurable.
- Reject hidden scope expansion.
- Require acceptance proof before completion.
- Require changed file evidence and command evidence in run report.
- For API or contract touching changes, run netnet integrity checks in `references/netnet-acceptance-gates.md`.

## Use Bundled Scripts
- Build a machine-clean work order skeleton:
  - `scripts/create_work_order.py`
- Validate work-order contract:
  - `scripts/validate_work_order.py`
- Grade run report against work order:
  - `scripts/grade_run.py`

## Read References
- Operating details: `references/operating-loop.md`
- NetNet gates: `references/netnet-acceptance-gates.md`
- Work order schema: `references/work_order.schema.json`
- Run report schema: `references/run_report.schema.json`
- Evaluation rubric: `references/eval_rubric.md`
- Example payloads: `references/work_order.example.json`, `references/run_report.example.json`
