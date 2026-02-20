from types import SimpleNamespace
from regenmind.units.unit_002 import Unit002


def test_unit_002_exec():
    u=Unit002()
    state=SimpleNamespace()
    out=u.execute(state)
    assert hasattr(out, 'metrics')
    assert out.metrics['total_runs']==1
