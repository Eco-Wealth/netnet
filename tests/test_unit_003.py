from types import SimpleNamespace
from regenmind.units.unit_003 import Unit003


def test_unit_003_exec():
    u=Unit003()
    state=SimpleNamespace()
    out=u.execute(state)
    assert hasattr(out, 'stats')
    assert out.stats['processed_count']==1
    assert 'U-003' in out.stats['markers']
