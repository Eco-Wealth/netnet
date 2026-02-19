import { createGitHubClient } from "./client";
import { getRepoInfo } from "./repoInfo";

export async function openPullRequest(owner: string, repo: string, branchName: string, title: string, body: string) {
  const octokit = createGitHubClient();
  const info = await getRepoInfo(owner, repo);
  const base = info.default_branch;

  const res = await octokit.rest.pulls.create({
    owner,
    repo,
    title,
    head: branchName,
    base,
    body,
  });

  return { url: res.data.html_url, number: res.data.number };
}
