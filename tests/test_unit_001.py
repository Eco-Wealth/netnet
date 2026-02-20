from types import SimpleNamespace
from regenmind.units.unit_001 import Unit001


def test_unit_001_exec():
    u = Unit001()
    state = SimpleNamespace()
    out = u.execute(state)
    assert hasattr(out, 'market')
    assert out.market['liquidity_index'] == 0.8
