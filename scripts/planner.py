def create_branch(branch):
    # ensure base branch
    run_cmd(["git", "checkout", "test-vealth-branch"])
    run_cmd(["git", "pull", "origin", "test-vealth-branch"])

    # delete branch if it already exists locally
    result = subprocess.run(
        ["git", "rev-parse", "--verify", branch],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        run_cmd(["git", "branch", "-D", branch])

    # create fresh branch
    run_cmd(["git", "checkout", "-b", branch])
