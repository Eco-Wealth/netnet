import { createBranchFromDefault } from "./createBranch";

async function main() {
  const owner = "openclaw";
  const repo = "openclaw";
  const branchName = `vealth-test-${Date.now()}`;

  try {
    const res = await createBranchFromDefault(owner, repo, branchName);
    console.log("Branch created:", res);
    process.exit(0);
  } catch (err: any) {
    console.error("Failed to create branch:", err.message || err);
    process.exit(1);
  }
}

main();
