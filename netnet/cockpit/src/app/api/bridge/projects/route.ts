import { NextRequest, NextResponse } from "next/server";
import { fetchProjects, fetchProject } from "@/lib/bridge";

/**
 * GET /api/bridge/projects
 * 
 * List all available carbon credit projects from Bridge.eco.
 * Optionally filter by type, location, or search query.
 * 
 * Query parameters:
 * - type: Filter by project type (e.g., "reforestation", "renewable")
 * - location: Filter by location
 * - q: Search query (searches name, type, location, registry)
 * - id: Get a specific project by ID
 * 
 * Response:
 * {
 *   "projects": [...],
 *   "total": number
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type")?.toLowerCase();
    const location = searchParams.get("location")?.toLowerCase();
    const query = searchParams.get("q")?.toLowerCase();
    const id = searchParams.get("id");

    // Get single project by ID
    if (id) {
      const project = await fetchProject(id);
      if (!project) {
        return NextResponse.json(
          { error: `Project not found: ${id}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ project });
    }

    // Get all projects with optional filtering
    const { projects } = await fetchProjects();
    
    const filtered = projects.filter((p) => {
      if (type && !String(p.type ?? "").toLowerCase().includes(type)) {
        return false;
      }
      if (location && !String(p.location ?? "").toLowerCase().includes(location)) {
        return false;
      }
      if (query) {
        const searchableText = [
          p.name,
          p.type,
          p.location,
          p.registry,
          p.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchableText.includes(query)) {
          return false;
        }
      }
      return true;
    });

    return NextResponse.json({
      projects: filtered,
      total: filtered.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
