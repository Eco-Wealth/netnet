import { access, readFile } from "node:fs/promises";
import path from "node:path";

type SkillRegistryRow = {
  id: string;
  route: string;
  description: string;
  ownership: string;
};

type ParsedSkillDoc = {
  description?: string;
  ownership?: string;
};

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveSkillsRoot() {
  const candidates = [
    path.resolve(process.cwd(), "../../skills"),
    path.resolve(process.cwd(), "../skills"),
    path.resolve(process.cwd(), "skills"),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return candidates[0];
}

function inferOwnership(id: string) {
  if (id.includes("cockpit")) return "cockpit";
  if (id.includes("economics")) return "economics";
  if (id.includes("openclaw")) return "openclaw";
  return "platform";
}

function parseFrontMatter(raw: string) {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) return {} as Record<string, string>;

  const lines = trimmed.split("\n");
  if (!lines.length || lines[0].trim() !== "---") return {} as Record<string, string>;

  const out: Record<string, string> = {};
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^--+$/.test(line)) break;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

function parseHeadingDescription(raw: string) {
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = /^#\s+(.+)$/.exec(line.trim());
    if (match) return match[1].trim();
  }
  return undefined;
}

async function readSkillDoc(skillsRoot: string, fileName: string): Promise<ParsedSkillDoc> {
  const skillPath = path.join(skillsRoot, fileName);
  try {
    const raw = await readFile(skillPath, "utf8");
    const fm = parseFrontMatter(raw);
    return {
      description: fm.description || parseHeadingDescription(raw),
      ownership: fm.ownership || fm.owner,
    };
  } catch {
    return {};
  }
}

function parseRoutes(cell: string) {
  const matches = [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
  if (matches.length > 0) return matches;
  return cell
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function loadRegistryRows(): Promise<SkillRegistryRow[]> {
  const skillsRoot = await resolveSkillsRoot();
  const registryPath = path.join(skillsRoot, "REGISTRY.md");
  let raw = "";
  try {
    raw = await readFile(registryPath, "utf8");
  } catch {
    return [];
  }

  const lines = raw.split("\n");
  const tableRows = lines.filter((line) => /^\|\s*`[^`]+`\s*\|/.test(line.trim()));

  const rows: SkillRegistryRow[] = [];
  for (const row of tableRows) {
    const cells = row
      .trim()
      .split("|")
      .slice(1, -1)
      .map((v) => v.trim());
    if (cells.length < 3) continue;

    const skillFileMatch = /`([^`]+)`/.exec(cells[0]);
    if (!skillFileMatch) continue;
    const skillFile = skillFileMatch[1];
    const id = skillFile.replace(/\.md$/i, "");
    const routes = parseRoutes(cells[2]);
    const doc = await readSkillDoc(skillsRoot, skillFile);

    rows.push({
      id,
      route: routes.join(", "),
      description:
        doc.description ||
        `Primary coverage: ${cells[2].replace(/\s+/g, " ").trim()}`,
      ownership: doc.ownership || inferOwnership(id),
    });
  }

  return rows;
}

export async function getSkillContextSummary() {
  const rows = await loadRegistryRows();
  if (!rows.length) {
    return "Skill registry summary unavailable.";
  }

  const header = "Skill registry (analysis-only context):";
  const lines = rows.map(
    (r) =>
      `- ${r.id} | owner:${r.ownership} | routes:${r.route} | ${r.description}`
  );
  return [header, ...lines].join("\n");
}

