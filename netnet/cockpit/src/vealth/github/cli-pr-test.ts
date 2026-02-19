import { createBranchFromDefault } from "./createBranch";
import { commitFileOnBranch } from "./commitFile";
import { openPullRequest } from "./openPullRequest";

async function main() {
  const owner = "openclaw";
  const repo = "openclaw";
  const branchName = `vealth-pr-test-${Date.now()}`;
  try {
    await createBranchFromDefault(owner, repo, branchName);
    const filePath = "vealth_test.txt";
    const content = `Vealth test commit at ${new Date().toISOString()}`;
    await commitFileOnBranch(owner, repo, branchName, filePath, content, "chore: vealth test commit");
    const pr = await openPullRequest(owner, repo, branchName, "Vealth test PR", "This is a test PR created by Vealth.");
    console.log("PR opened:", pr.url);
    process.exit(0);
  } catch (err: any) {
    console.error("Failed to create PR:", err.message || err);
    process.exit(1);
  }
}

main();
