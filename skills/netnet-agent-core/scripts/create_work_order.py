#!/usr/bin/env python3
import argparse
import json
from datetime import datetime, timezone


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a NetNet work order JSON skeleton")
    parser.add_argument("--id", required=True, help="Work order id")
    parser.add_argument("--objective", required=True, help="Single objective sentence")
    parser.add_argument("--constraint", action="append", default=[], help="Repeatable constraint")
    parser.add_argument("--deliverable", action="append", default=[], help="Repeatable deliverable")
    parser.add_argument("--acceptance", action="append", default=[], help="Repeatable acceptance test")
    parser.add_argument("--context-path", action="append", default=[], help="Repeatable context path")
    parser.add_argument("--assumption", action="append", default=[], help="Repeatable assumption")
    parser.add_argument("--out", default="", help="Output file path; default prints to stdout")
    args = parser.parse_args()

    if not args.constraint:
      raise SystemExit("At least one --constraint is required")
    if not args.deliverable:
      raise SystemExit("At least one --deliverable is required")
    if not args.acceptance:
      raise SystemExit("At least one --acceptance is required")

    payload = {
        "id": args.id,
        "objective": args.objective,
        "constraints": args.constraint,
        "deliverables": args.deliverable,
        "acceptance_tests": args.acceptance,
        "context_paths": args.context_path,
        "assumptions": args.assumption,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    content = json.dumps(payload, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            handle.write(content + "\n")
        print(args.out)
    else:
        print(content)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
