import { createGitHubClient } from "./client";
import { getRepoInfo } from "./repoInfo";

export async function createBranchFromDefault(owner: string, repo: string, branchName: string) {
  const octokit = createGitHubClient();

  // Ensure repo info
  const info = await getRepoInfo(owner, repo);
  const defaultBranch = info.default_branch;

  // Get the reference for the default branch to obtain its SHA
  const refName = `heads/${defaultBranch}`;
  const refRes = await octokit.rest.git.getRef({ owner, repo, ref: refName });
  const sha = refRes.data.object.sha;

  // Check if target branch already exists
  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branchName}` });
    throw new Error(`Branch already exists: ${branchName}`);
  } catch (err: any) {
    // If error is 404, branch doesn't exist — proceed. Otherwise rethrow.
    if (err.status && err.status === 404) {
      // create branch
      await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha });
      return { success: true, branch: branchName };
    }
    throw err;
  }
}
