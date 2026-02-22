#!/usr/bin/env python3
import json
import sys
from typing import Any, Dict, List, Set


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def as_set(values: List[Any]) -> Set[str]:
    return {str(v).strip() for v in values if str(v).strip()}


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: grade_run.py <work-order.json> <run-report.json>")
        return 1

    work_order_path = sys.argv[1]
    run_report_path = sys.argv[2]

    try:
        work_order = load_json(work_order_path)
        run_report = load_json(run_report_path)
    except FileNotFoundError as err:
        print(f"ERROR: {err}")
        return 1
    except json.JSONDecodeError as err:
        print(f"ERROR: {err}")
        return 1

    required_deliverables = as_set(work_order.get("deliverables", []))
    completed_deliverables = as_set(run_report.get("deliverables_completed", []))

    acceptance_results = run_report.get("acceptance_results", [])
    passed_acceptance = [x for x in acceptance_results if isinstance(x, dict) and x.get("passed") is True]

    changed_files = run_report.get("changed_files", [])

    objective_score = 30 if required_deliverables.issubset(completed_deliverables) else 15 if completed_deliverables else 0

    if acceptance_results:
        pass_ratio = len(passed_acceptance) / len(acceptance_results)
        acceptance_score = round(40 * pass_ratio)
    else:
        acceptance_score = 0

    blockers = run_report.get("blockers", [])
    scope_score = 15 if isinstance(blockers, list) and len(blockers) == 0 else 8

    artifact_score = 15
    if not isinstance(changed_files, list) or len(changed_files) == 0:
        artifact_score -= 8
    if not run_report.get("work_order_id"):
        artifact_score -= 7
    artifact_score = max(0, artifact_score)

    total = objective_score + acceptance_score + scope_score + artifact_score

    result: Dict[str, Any] = {
        "score": total,
        "bands": {
            "objective_coverage": objective_score,
            "acceptance_tests": acceptance_score,
            "scope_discipline": scope_score,
            "artifact_quality": artifact_score,
        },
        "summary": {
            "deliverables_required": sorted(required_deliverables),
            "deliverables_completed": sorted(completed_deliverables),
            "acceptance_total": len(acceptance_results),
            "acceptance_passed": len(passed_acceptance),
            "changed_files": len(changed_files) if isinstance(changed_files, list) else 0,
        },
        "grade": "production-ready" if total >= 85 else "acceptable" if total >= 70 else "rework-required",
    }

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
