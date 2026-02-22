#!/usr/bin/env python3
import json
import sys
from typing import Any


REQUIRED = {
    "id": str,
    "objective": str,
    "constraints": list,
    "deliverables": list,
    "acceptance_tests": list,
}


def fail(message: str) -> int:
    print(f"INVALID: {message}")
    return 1


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: validate_work_order.py <work-order.json>")
        return 1

    path = sys.argv[1]
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload: Any = json.load(handle)
    except FileNotFoundError:
        return fail(f"file not found: {path}")
    except json.JSONDecodeError as err:
        return fail(f"invalid json: {err}")

    if not isinstance(payload, dict):
        return fail("root must be object")

    for key, expected_type in REQUIRED.items():
        if key not in payload:
            return fail(f"missing required key: {key}")
        if not isinstance(payload[key], expected_type):
            return fail(f"{key} must be {expected_type.__name__}")

    if not payload["constraints"]:
        return fail("constraints must not be empty")
    if not payload["deliverables"]:
        return fail("deliverables must not be empty")
    if not payload["acceptance_tests"]:
        return fail("acceptance_tests must not be empty")

    print("VALID")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
