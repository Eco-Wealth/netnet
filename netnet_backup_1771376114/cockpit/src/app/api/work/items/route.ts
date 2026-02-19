import { GET as listWork, POST as createWork } from "../route";

// Backward-compatible alias:
// - GET  /api/work/items -> GET  /api/work
// - POST /api/work/items -> POST /api/work
export const GET = listWork;
export const POST = createWork;
