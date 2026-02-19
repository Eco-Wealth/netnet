export type TradeSignal = 
  | { type: "NO_ACTION" }
  | { type: "REGEN_ACTIVITY_HIGH"; confidence: number }
  | { type: "BASE_ACTIVITY_HIGH"; confidence: number };