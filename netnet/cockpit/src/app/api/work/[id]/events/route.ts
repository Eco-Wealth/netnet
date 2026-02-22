import { POST as appendEvent } from "../route";

// Backward-compatible alias:
// - POST /api/work/:id/events -> POST /api/work/:id
export const POST = appendEvent;
