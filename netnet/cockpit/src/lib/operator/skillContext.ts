import fs from "fs";
import path from "path";

export type SkillInfo = {
  id: string;
  route: string;
  description: string;
  ownership: string;
};

function resolveRegistryPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "skills/REGISTRY.md"),
    path.resolve(process.cwd(), "../skills/REGISTRY.md"),
    path.resolve(process.cwd(), "../../skills/REGISTRY.md"),
    path.resolve(process.cwd(), "../../../skills/REGISTRY.md"),
    path.resolve(process.cwd(), "../../../../skills/REGISTRY.md"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function parseRegistryMarkdown(markdown: string): SkillInfo[] {
  const rows = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  const skills: SkillInfo[] = [];
  for (const row of rows) {
    if (row.includes("---")) continue;

    const parts = row
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length !== 4) continue;
    if (parts[0].toLowerCase() === "id") continue;

    const [id, route, description, ownership] = parts;
    skills.push({ id, route, description, ownership });
  }

  return skills;
}

export function getSkills(): SkillInfo[] {
  const registryPath = resolveRegistryPath();
  if (!registryPath) return [];

  const markdown = fs.readFileSync(registryPath, "utf8");
  return parseRegistryMarkdown(markdown);
}

export function getSkillContextSummary(): string {
  const skills = getSkills();
  if (!skills.length) return "No skills registry entries were found.";

  return skills
    .map((skill) => `- ${skill.id} (${skill.route}) — ${skill.description} [owner: ${skill.ownership}]`)
    .join("\n");
}
