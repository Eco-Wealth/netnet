import fs from "fs";
import path from "path";

export type SkillInfo = {
  id: string;
  route: string;
  description: string;
  ownership: string;
};

function resolveRegistryPath(): string | null {
  const starts = [
    process.cwd(),
    __dirname,
  ];

  for (const start of starts) {
    let current = path.resolve(start);
    while (true) {
      const candidate = path.join(current, "skills", "REGISTRY.md");
      if (fs.existsSync(candidate)) return candidate;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  try {
    const fallback = path.resolve(__dirname, "../../../../../../skills/REGISTRY.md");
    if (fs.existsSync(fallback)) return fallback;
  } catch {
    // ignore
  }
  return null;
}

function parseRegistryMarkdown(markdown: string): SkillInfo[] {
  const cleanCell = (value: string) =>
    value.replace(/^`(.+)`$/, "$1").replace(/^"+|"+$/g, "").trim();

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

    const [idRaw, routeRaw, descriptionRaw, ownershipRaw] = parts;
    const id = cleanCell(idRaw);
    const route = cleanCell(routeRaw);
    const description = cleanCell(descriptionRaw);
    const ownership = cleanCell(ownershipRaw);

    if (!id || !route.startsWith("/")) continue;
    if (id.toLowerCase() === "skill file") continue;

    skills.push({ id, route, description, ownership });
  }

  const deduped = new Map<string, SkillInfo>();
  for (const skill of skills) {
    deduped.set(`${skill.id}:${skill.route}`, skill);
  }
  return [...deduped.values()];
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
    .sort((a, b) => {
      const aBankr = a.id.startsWith("bankr.") ? 0 : 1;
      const bBankr = b.id.startsWith("bankr.") ? 0 : 1;
      if (aBankr !== bBankr) return aBankr - bBankr;
      return a.id.localeCompare(b.id);
    })
    .map(
      (skill) =>
        `- ${skill.id} (${skill.route}) — ${skill.description} [owner: ${skill.ownership}]`
    )
    .join("\n");
}
