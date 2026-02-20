from regenmind.core.base import BaseUnit
from regenmind.core.telemetry.logger import emit
import time

class Unit001(BaseUnit):

    manifest = {
        "unit_id": "U-001",
        "layer": "data",
        "type": "deterministic",
        "capital_impact": False,
        "audit_required": False
    }

    def execute(self, state):
        """Simple data-sync unit: ensures liquidity_index exists and emits telemetry.
        Idempotent: leaves existing value alone.
        """
        start = time.time()
        if not hasattr(state, 'market') or state.market is None:
            state.market = {}
        state.market.setdefault('liquidity_index', 0.8)
        runtime = (time.time() - start) * 1000
        try:
            emit(self.manifest['unit_id'], 'success', runtime)
        except Exception:
            pass
        return state
