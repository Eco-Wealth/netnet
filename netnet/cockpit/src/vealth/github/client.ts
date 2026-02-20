import { Octokit } from "@octokit/rest";

export function createGitHubClient(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required to create GitHub client.");
  }
  return new Octokit({ auth: token });
}
