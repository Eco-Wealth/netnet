# Unit 054 UX Audit (Tab-by-Tab)

## Route List (from `src/app`)
- `/operator`
- `/work`
- `/workbench`
- `/wallet`
- `/token`
- `/retire`
- `/regen/projects`
- `/economics`
- `/economics/loop`
- `/programs`
- `/programs/run`
- `/security`
- `/execute`
- `/execute/launch`
- `/execute/paper`
- `/ops`
- `/governance`
- `/identity`
- `/distribute`

## `/operator`
What this is: Chat-first operator seat for proposals, approvals, intent, plans, and execution.
Primary action: Send an operator message to produce analysis/proposals.
Secondary actions: approve/reject proposal, lock intent, run plan/execute.
Remove/rename:
- Cut repeated onboarding text in multiple places.
- Keep guidance collapsed and short.
- Keep action labels as verbs.
Agent-readiness: Agent needs current policy mode, proposal status, intent state, and skill summary; output is proposal/plan/result envelopes.
Copy cuts: Replaced long explanations with collapsible “What do I do here?” and “Outputs”.

## `/work`
What this is: Work queue for tracked operator tasks.
Primary action: Create work item.
Secondary actions: refresh list, inspect status counts, review item cards.
Remove/rename:
- Remove SLA/audit sentence duplication.
- Rename “Create” to “Create Work Item”.
Agent-readiness: Agent needs title/owner/priority/tags; output is structured work item records.
Copy cuts: Header now concise with collapsed guidance and outputs.

## `/workbench`
What this is: Quick endpoint runner with optional work-event logging.
Primary action: Run endpoint check.
Secondary actions: clear active work id, inspect output payload.
Remove/rename:
- Remove duplicate page-level intro from component body.
- Keep one clear “active work” line.
Agent-readiness: Agent needs endpoint selection and optional work id; output is endpoint response plus event linkage.
Copy cuts: Reduced demo narrative to single-line guidance.

## `/wallet`
What this is: Read-only wallet balances/positions/history panel.
Primary action: Refresh selected wallet tab.
Secondary actions: switch tab, set wallet filter.
Remove/rename:
- Remove duplicated wallet heading inside panel.
- Remove verbose API explanation block from core viewport.
Agent-readiness: Agent needs optional wallet + tab; output is read-only wallet snapshots.
Copy cuts: Header and panel text tightened.

## `/token`
What this is: Bankr token state and actions reference page.
Primary action: Review token status JSON.
Secondary actions: open actions JSON, jump to Proof/Execute.
Remove/rename:
- Remove centered card/nav shell mismatch.
- Remove long roadmap sentence.
Agent-readiness: Agent needs token info + action list for proposals; output is canonical token/action JSON.
Copy cuts: Reduced to direct status + actions language.

## `/retire`
What this is: Simple retirement intent wizard.
Primary action: Step through project → amount → tx hash.
Secondary actions: generate proof after tracked state.
Remove/rename:
- Remove unstyled form controls.
- Replace vague text with direct step guidance.
Agent-readiness: Agent needs project id, amount, tx hash; output is retirement tracking state.
Copy cuts: Kept only step-relevant instructions.

## `/regen/projects`
What this is: Proposal-only regen project packet generator.
Primary action: Generate packet.
Secondary actions: validate packet, create work item.
Remove/rename:
- Remove repeated proposal-only caveat in body.
- Keep one concise page instruction line.
Agent-readiness: Agent needs packet fields + MRV notes; output is packet/validation/work payload.
Copy cuts: Header and CTA copy simplified.

## `/economics`
What this is: Allocation planner reference.
Primary action: Use allocation endpoint with planning payload.
Secondary actions: open linked tabs (Proof/Execute/Retire).
Remove/rename:
- Remove long endpoint prose.
- Keep one short invocation example.
Agent-readiness: Agent needs realized fees input; output is allocation packet and next action.
Copy cuts: Condensed to one endpoint line + one example line.

## `/economics/loop`
What this is: Revenue → allocation → retire-intent proposal loop.
Primary action: Run loop.
Secondary actions: create work item from output.
Remove/rename:
- Remove repeated proposal-only explanation.
- Keep output description compact.
Agent-readiness: Agent needs window/amount; output is report + allocation + intent + proof payload.
Copy cuts: Replaced header paragraph with concise guidance/outputs.

## `/programs`
What this is: Catalog of strategy program presets.
Primary action: Choose a preset to open in Execute/Proof flow.
Secondary actions: inspect tags and deterministic steps.
Remove/rename:
- Remove oversized typography and airy spacing.
- Standardize card styling with app surfaces.
Agent-readiness: Agent needs program id and steps; output is deterministic run metadata.
Copy cuts: Kept short descriptions and direct actions.

## `/programs/run`
What this is: Proposal packet generator for selected program.
Primary action: Draft proposal.
Secondary actions: choose actor, inspect output.
Remove/rename:
- Rename “Generate proposal” to “Draft Proposal”.
- Remove repeated work-item explanation.
Agent-readiness: Agent needs program id + actor; output is proposal packet + optional work reference.
Copy cuts: Tight subtitle and action text.

## `/security`
What this is: Read-only security self-audit dashboard.
Primary action: Review failing/warning checks.
Secondary actions: inspect remediation notes, jump to related tabs.
Remove/rename:
- Remove duplicated intro sentence and nav prose.
- Keep status summary front-loaded.
Agent-readiness: Agent needs audit summary/check list; output is actionable status + remediation text.
Copy cuts: Replaced long intro with concise guidance/outputs.

## `/execute`
What this is: Task draft surface for execution-oriented operator work.
Primary action: Queue draft task.
Secondary actions: edit constraints, inspect placeholder output.
Remove/rename:
- Rename “Queue (placeholder)” to “Queue Draft”.
- Trim module descriptions to short bullets.
Agent-readiness: Agent needs task + constraints; output is execution draft payload text.
Copy cuts: Swapped paragraph copy for concise guidance/outputs.

## `/execute/launch`
What this is: Launch proposal semantics reference.
Primary action: Review launch route contract.
Secondary actions: open proof route.
Remove/rename:
- Remove long explanatory sentence.
- Keep API and implications as concise bullets.
Agent-readiness: Agent needs route contract and approval requirement; output is launch proposal envelope context.
Copy cuts: Replaced long preface with short header guidance.

## `/execute/paper`
What this is: Trade quote + dry-run plan simulator.
Primary action: Quote or build dry-run plan.
Secondary actions: adjust pair/amount, inspect response JSON.
Remove/rename:
- Shorten “safe stub” messaging.
- Rename long button labels to direct verbs.
Agent-readiness: Agent needs side/tokens/amount/reason; output is simulated quote/plan JSON.
Copy cuts: Condensed warning and response copy.

## `/ops`
What this is: Quick-launch hub for major UI/API surfaces.
Primary action: Open target UI/API link.
Secondary actions: inspect docs links.
Remove/rename:
- Remove oversized “operator console” framing.
- Reduce spacing and repeated tips.
Agent-readiness: Agent needs endpoint names and URLs; output is direct navigation targets.
Copy cuts: Shifted to concise route launcher copy.

## `/governance`
What this is: Policy editor for autonomy/caps/kill switches.
Primary action: Save policy.
Secondary actions: reload policy, adjust allowlists.
Remove/rename:
- Remove duplicated policy framing around editor.
- Keep one instruction line only.
Agent-readiness: Agent needs policy envelope fields; output is persisted policy snapshot.
Copy cuts: Added concise tab header; removed redundant prose.

## `/identity`
What this is: Local identity metadata editor.
Primary action: Edit identity fields.
Secondary actions: validate wallet format.
Remove/rename:
- Remove duplicate page-level and card-level long explanation.
- Keep local-storage scope explicit and short.
Agent-readiness: Agent needs identity fields; output is local identity metadata used in proof objects.
Copy cuts: Replaced paragraph with concise guidance/outputs.

## `/distribute`
What this is: Searchable proof feed with sharing links.
Primary action: Filter and share proof items.
Secondary actions: copy item link, open external links, open RSS.
Remove/rename:
- Remove bright-card visual mismatch versus cockpit shell.
- Reduce repeated “share” and refresh wording.
Agent-readiness: Agent needs feed item fields and filters; output is filtered feed list + shareable URLs.
Copy cuts: Header + controls simplified, dense styling aligned with shell.
