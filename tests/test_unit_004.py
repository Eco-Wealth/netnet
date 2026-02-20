from types import SimpleNamespace
from regenmind.units.unit_004 import Unit004


def test_unit_004_exec():
    u=Unit004()
    state=SimpleNamespace()
    out=u.execute(state)
    assert hasattr(out, 'stats')
    assert out.stats['processed_count']==1
    assert 'U-004' in out.stats['markers']
