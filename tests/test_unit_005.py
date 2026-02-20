from types import SimpleNamespace
from regenmind.units.unit_005 import Unit005


def test_unit_005_exec():
    u=Unit005()
    state=SimpleNamespace()
    out=u.execute(state)
    assert hasattr(out, 'stats')
    assert out.stats['processed_count']==1
    assert 'U-005' in out.stats['markers']
