import fs from "fs";
import path from "path";

function scoreCockpitPath(absPath) {
  if (!fs.existsSync(path.join(absPath, "package.json"))) return -1;
  let score = 0;
  if (fs.existsSync(path.join(absPath, "src", "app", "operator", "page.tsx"))) score += 3;
  if (fs.existsSync(path.join(absPath, "src", "app", "api", "health", "route.ts"))) score += 2;
  if (fs.existsSync(path.join(absPath, "src", "components", "operator"))) score += 2;
  return score;
}

export function findCockpitRoot(repoRoot) {
  const candidates = [
    path.join(repoRoot, "netnet", "netnet", "cockpit"),
    path.join(repoRoot, "netnet", "cockpit"),
  ];

  const scored = candidates
    .map((candidate) => ({ candidate, score: scoreCockpitPath(candidate) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    throw new Error("Unable to locate cockpit app directory.");
  }

  return scored[0].candidate;
}

export function toRepoRelative(repoRoot, absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}
