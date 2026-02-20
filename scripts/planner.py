import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKLOG_PATH = REPO_ROOT / "backlog" / "units.json"


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


def load_backlog():
    with open(BACKLOG_PATH, "r") as f:
        return json.load(f)


def save_backlog(data):
    with open(BACKLOG_PATH, "w") as f:
        json.dump(data, f, indent=2)


def select_next_unit():
    units = load_backlog()
    for unit in units:
        if unit["status"] == "PENDING":
            return unit
    return None


def update_unit_status(unit_id, new_status):
    units = load_backlog()
    for unit in units:
        if unit["id"] == unit_id:
            unit["status"] = new_status
            break
    save_backlog(units)


def normalize_unit(unit_id):
    # U-002 -> u_002
    return unit_id.lower().replace("-", "_")


def class_name(unit_id):
    # U-002 -> U002
    return unit_id.replace("-", "")


def create_branch(branch):
    run_cmd(["git", "checkout", "test-vealth-branch"])
    run_cmd(["git", "pull", "origin", "test-vealth-branch"])

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
    env = dict(**subprocess.os.environ)
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

    update_unit_status(unit_id, "IN_PROGRESS")
    create_branch(branch)

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

    run_tests()

    update_unit_status(unit_id, "IN_REVIEW")

    print(f"=== {unit_id} COMPLETE ===\n")


def main():
    print("=== VELATH BATCH MODE START ===")

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

    print("=== BATCH MODE COMPLETE ===")


if __name__ == "__main__":
    main()
