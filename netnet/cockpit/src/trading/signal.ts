import { MarketSnapshot } from '../mcp/types';
import { TradeSignal } from './types';

export function generateSignal(snapshot: MarketSnapshot): TradeSignal {
  if (snapshot.regen.latestBlock % 10 === 0) {
    return { type: "REGEN_ACTIVITY_HIGH", confidence: 0.6 };
  } else if (snapshot.base.latestBlockNumber % 10 === 0) {
    return { type: "BASE_ACTIVITY_HIGH", confidence: 0.6 };
  } else {
    return { type: "NO_ACTION" };
  }
}