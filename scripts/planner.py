import json
import subprocess
import sys
from pathlib import Path
import os

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKLOG_PATH = REPO_ROOT / "backlog" / "units.json"
BASE_BRANCH = "test-vealth-branch"


def run_cmd(cmd, env=None):
    print("RUN>", " ".join(cmd))
    result = subprocess.run(
        cmd,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        env=env,
    )
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")
    return result


def checkout_base():
    run_cmd(["git", "checkout", BASE_BRANCH])
    run_cmd(["git", "pull", "origin", BASE_BRANCH])


def load_backlog():
    with open(BACKLOG_PATH, "r") as f:
        return json.load(f)


def save_backlog(data):
    with open(BACKLOG_PATH, "w") as f:
        json.dump(data, f, indent=2)


def commit_backlog(message):
    run_cmd(["git", "add", "backlog/units.json"])
    run_cmd(["git", "commit", "-m", message])
    run_cmd(["git", "push", "origin", BASE_BRANCH])


def select_next_unit():
    units = load_backlog()
    for unit in units:
        if unit["status"] == "PENDING":
            return unit
    return None


def normalize_unit(unit_id):
    return unit_id.lower().replace("-", "_")


def class_name(unit_id):
    return unit_id.replace("-", "")


def create_feature_branch(branch):
    checkout_base()
    result = subprocess.run(
        ["git", "rev-parse", "--verify", branch],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        run_cmd(["git", "branch", "-D", branch])
    run_cmd(["git", "checkout", "-b", branch])


def run_tests():
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT)

    run_cmd(
        [str(REPO_ROOT / ".venv" / "bin" / "pytest"), "-q"],
        env=env,
    )


def process_unit(unit):
    unit_id = unit["id"]
    module_name = normalize_unit(unit_id)
    cls_name = class_name(unit_id)
    branch = f"feature/vealth-{module_name}"

    print(f"\n=== PROCESSING {unit_id} ===")

    # 1️⃣ Mark IN_PROGRESS on base and commit
    checkout_base()
    units = load_backlog()
    for u in units:
        if u["id"] == unit_id:
            u["status"] = "IN_PROGRESS"
            break
    save_backlog(units)
    commit_backlog(f"planner: {unit_id} -> IN_PROGRESS")

    # 2️⃣ Create feature branch and implement
    create_feature_branch(branch)

    unit_file = REPO_ROOT / "regenmind" / "units" / f"{module_name}.py"
    unit_file.parent.mkdir(parents=True, exist_ok=True)

    unit_file.write_text(
        f"class {cls_name}:\n"
        f"    def execute(self):\n"
        f"        return '{unit_id} executed'\n"
    )

    test_file = REPO_ROOT / "tests" / f"test_{module_name}.py"
    test_file.parent.mkdir(parents=True, exist_ok=True)

    test_file.write_text(
        f"from regenmind.units.{module_name} import {cls_name}\n\n"
        f"def test_{module_name}():\n"
        f"    assert {cls_name}().execute() == '{unit_id} executed'\n"
    )

    run_cmd(["git", "add", "."])
    run_cmd(["git", "commit", "-m", f"unit: implement {unit_id}"])
    run_cmd(["git", "push", "-u", "origin", branch])

    # 3️⃣ Tests
    run_tests()

    # 4️⃣ Back to base and mark IN_REVIEW
    checkout_base()
    units = load_backlog()
    for u in units:
        if u["id"] == unit_id:
            u["status"] = "IN_REVIEW"
            break
    save_backlog(units)
    commit_backlog(f"planner: {unit_id} -> IN_REVIEW")

    print(f"=== {unit_id} COMPLETE ===\n")


def main():
    print("=== VELATH BATCH MODE START ===\n")

    while True:
        unit = select_next_unit()

        if not unit:
            print("No PENDING units remaining. Exiting.")
            break

        try:
            process_unit(unit)
        except Exception as e:
            print(f"Unit failed: {e}")
            break

    print("\n=== BATCH MODE COMPLETE ===")


if __name__ == "__main__":
    main()
