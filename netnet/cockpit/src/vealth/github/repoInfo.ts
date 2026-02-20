import { createGitHubClient } from "./client";

export async function getRepoInfo(owner: string, repo: string) {
  const octokit = createGitHubClient();
  const res = await octokit.rest.repos.get({ owner, repo });
  const data = res.data;
  return {
    default_branch: data.default_branch,
    private: data.private,
    latest_commit_sha: data.pushed_at, // fallback to pushed_at as latest activity timestamp
  };
}
