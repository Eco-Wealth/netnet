import { createBranchFromDefault } from "./createBranch";
import { commitFileOnBranch } from "./commitFile";

async function main() {
  const owner = "openclaw";
  const repo = "openclaw";
  const branchName = `vealth-commit-test-${Date.now()}`;
  try {
    await createBranchFromDefault(owner, repo, branchName);
    const filePath = "vealth_test.txt";
    const content = `Vealth test commit at ${new Date().toISOString()}`;
    const res = await commitFileOnBranch(owner, repo, branchName, filePath, content, "chore: vealth test commit");
    console.log("Commit SHA:", res.commitSha);
    process.exit(0);
  } catch (err: any) {
    console.error("Failed to create branch and commit:", err.message || err);
    process.exit(1);
  }
}

main();
