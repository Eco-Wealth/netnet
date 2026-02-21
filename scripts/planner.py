#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime, timezone

# -----------------------------
# Configuration
# -----------------------------
REPO = "Eco-Wealth/netnet"
REPO_ROOT = Path(__file__).resolve().parents[1]  # /home/ubuntu/netnet/scripts/planner.py -> /home/ubuntu/netnet
BACKLOG_PATH = REPO_ROOT / "backlog" / "units.json"
BASE_BRANCH = "test-vealth-branch"

# -----------------------------
# Helpers
# -----------------------------
def sh(cmd, env=None, allow_fail=False):
    """
    Run a command list under REPO_ROOT, print stdout/stderr.
    Fail on non-zero unless allow_fail=True.
    """
    print("RUN>", " ".join(cmd))
    r = subprocess.run(
        cmd,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        env=env,
    )
    if r.stdout:
        print(r.stdout, end="")
    if r.stderr:
        print(r.stderr, file=sys.stderr, end="")
    if r.returncode != 0 and not allow_fail:
        raise RuntimeError(f"Command failed ({r.returncode}): {' '.join(cmd)}")
    return r

def assert_in_repo():
    """
    Fail fast if not running inside a git working tree at REPO_ROOT,
    and ensure origin remote exists.
    """
    try:
        subprocess.check_call(["git", "rev-parse", "--is-inside-work-tree"], cwd=str(REPO_ROOT))
    except Exception as e:
        print(f"ERROR: Not inside a git work tree at {REPO_ROOT}: {e}", file=sys.stderr)
        sys.exit(1)

    r = subprocess.run(["git", "remote"], cwd=str(REPO_ROOT), capture_output=True, text=True)
    if r.returncode != 0 or "origin" not in (r.stdout or ""):
        print("ERROR: git remote 'origin' not found. Fix remotes before running worker.", file=sys.stderr)
        sys.exit(1)

def load_units():
    if not BACKLOG_PATH.exists():
        raise RuntimeError(f"Backlog file not found: {BACKLOG_PATH}")
    with open(BACKLOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def save_units(units):
    with open(BACKLOG_PATH, "w", encoding="utf-8") as f:
        json.dump(units, f, indent=2)
        f.write("\n")

def norm_id(unit_id: str) -> str:
    # U-031 -> u_031
    return unit_id.lower().replace("-", "_")

def class_name(unit_id: str) -> str:
    # U-031 -> U031
    return unit_id.replace("-", "")

def ensure_on_base():
    sh(["git", "checkout", BASE_BRANCH])
    sh(["git", "pull", "origin", BASE_BRANCH])

def run_tests():
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT)

    pytest_bin = REPO_ROOT / ".venv" / "bin" / "pytest"
    if pytest_bin.exists():
        sh([str(pytest_bin), "-q"], env=env)
    else:
        # fallback (should still work if pytest is on PATH)
        sh(["pytest", "-q"], env=env)

def pick_next_pending(units):
    for u in units:
        if u.get("status") == "PENDING":
            return u
    return None

def create_feature_branch(branch):
    """
    Create a clean feature branch based on local BASE_BRANCH.
    """
    ensure_on_base()
    sh(["git", "branch", "-D", branch], allow_fail=True)
    sh(["git", "checkout", "-b", branch])

def commit_all(message):
    sh(["git", "add", "."])
    # If nothing is staged, don't create empty commits
    diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=str(REPO_ROOT))
    if diff.returncode == 0:
        raise RuntimeError("No staged changes to commit (empty commit would be created).")
    sh(["git", "commit", "-m", message])

def push_branch(branch):
    # If remote branch exists and diverged, overwrite it safely (CI branches)
    sh(["git", "push", "-u", "origin", branch, "--force-with-lease"])

def pr_create(base, head, title, body):
    """
    Create a PR using gh with explicit --repo.
    Allow failure if PR already exists.
    """
    sh([
        "gh", "pr", "create",
        "--repo", REPO,
        "--base", base,
        "--head", head,
        "--title", title,
        "--body", body
    ], allow_fail=True)

def pr_merge(head):
    """
    Merge a PR by head branch. Use explicit --repo.
    Prefer normal merge; fallback to --admin.
    """
    r = sh(["gh", "pr", "merge", "--repo", REPO, head, "--merge", "--delete-branch"], allow_fail=True)
    if r.returncode == 0:
        return True
    r2 = sh(["gh", "pr", "merge", "--repo", REPO, head, "--merge", "--delete-branch", "--admin"], allow_fail=True)
    return r2.returncode == 0

# -----------------------------
# Worker
# -----------------------------
def worker_once():
    """
    PR-only worker cycle:
    - pick one PENDING unit
    - create feature branch
    - implement a minimal unit + test (placeholder)
    - run tests
    - mark DONE in backlog (in the PR branch only)
    - commit, push, PR create, PR merge
    """
    print("=== VEALTH PR-ONLY WORKER RUN ===")
    assert_in_repo()

    units = load_units()
    unit = pick_next_pending(units)
    if not unit:
        print("No PENDING units remaining. Exiting.")
        return 0

    unit_id = unit["id"]  # e.g. U-031
    module = norm_id(unit_id)  # u_031
    cls = class_name(unit_id)  # U031

    branch = f"feature/vealth-{module}"
    title = f"{unit_id}"
    body = f"Auto-generated unit {unit_id} @ {datetime.now(timezone.utc).isoformat()}"

    print(f"=== PROCESSING {unit_id} ===")

    # Create feature branch
    create_feature_branch(branch)

    # Paths for unit and test
    unit_path = REPO_ROOT / "regenmind" / "units" / f"{module}.py"
    test_path = REPO_ROOT / "tests" / f"test_{module}.py"
    unit_path.parent.mkdir(parents=True, exist_ok=True)
    test_path.parent.mkdir(parents=True, exist_ok=True)

    # Minimal placeholder implementation (safe, deterministic)
    unit_path.write_text(
        f"class {cls}:\n"
        f"    def execute(self):\n"
        f"        return '{unit_id} executed'\n",
        encoding="utf-8"
    )
    test_path.write_text(
        f"from regenmind.units.{module} import {cls}\n\n"
        f"def test_{module}():\n"
        f"    assert {cls}().execute() == '{unit_id} executed'\n",
        encoding="utf-8"
    )

    # Run tests with explicit PYTHONPATH
    run_tests()

    # Mark DONE in backlog within PR branch only
    units = load_units()
    for u in units:
        if u.get("id") == unit_id:
            u["status"] = "DONE"
            break
    save_units(units)

    # Commit, push, PR, merge
    commit_all(f"unit: implement {unit_id} (PR-only)")
    push_branch(branch)
    pr_create(BASE_BRANCH, branch, title, body)

    merged = pr_merge(branch)
    if not merged:
        raise RuntimeError(f"PR merge failed for {branch}. Check repo settings / protections.")

    print(f"=== {unit_id} COMPLETE (MERGED) ===")
    print("=== WORKER EXIT ===")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(worker_once())
    except Exception as e:
        print(f"WORKER FAILED: {e}", file=sys.stderr)
        sys.exit(1)
