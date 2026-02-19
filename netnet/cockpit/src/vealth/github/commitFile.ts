import { createGitHubClient } from "./client";

export async function commitFileOnBranch(
  owner: string,
  repo: string,
  branchName: string,
  filePath: string,
  content: string,
  commitMessage: string
) {
  const octokit = createGitHubClient();

  // Get the file if it exists on the branch to obtain its SHA
  try {
    const getRes = await octokit.rest.repos.getContent({ owner, repo, path: filePath, ref: `refs/heads/${branchName}` });
    // If exists, update
    // The API returns an array for directories; ensure it's a file
    // @ts-ignore
    const sha = Array.isArray(getRes.data) ? undefined : (getRes.data as any).sha;
    const encoded = Buffer.from(content, "utf8").toString("base64");
    const res = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      content: encoded,
      branch: branchName,
      sha,
    });
    return { commitSha: res.data.commit.sha };
  } catch (err: any) {
    // If 404 -> file does not exist, create it
    if (err.status && err.status === 404) {
      const encoded = Buffer.from(content, "utf8").toString("base64");
      const res = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: encoded,
        branch: branchName,
      });
      return { commitSha: res.data.commit.sha };
    }
    throw err;
  }
}
