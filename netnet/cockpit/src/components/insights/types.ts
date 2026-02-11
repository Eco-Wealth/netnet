export type InsightSpec = {
  /** What is this control/section? */
  what: string;
  /** Why does it matter? What is the impact? */
  why?: string;
  /** What is required for this to work safely/correctly? */
  requires?: string[];
  /** What does this produce? Where does it flow next? */
  outputs?: string[];
};
