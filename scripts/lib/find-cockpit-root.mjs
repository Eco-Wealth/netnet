import path from "path";

export function findCockpitRoot(repoRoot) {
  return path.join(repoRoot, "netnet", "cockpit");
}

export function toRepoRelative(repoRoot, absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}
