
import importlib
from regenmind.state.state import SystemState

def run_unit(unit_number):
    module_name = f"regenmind.units.unit_{unit_number:03}"
    module = importlib.import_module(module_name)
    class_name = f"Unit{unit_number:03}"
    unit_class = getattr(module, class_name)
    state = SystemState()
    unit = unit_class()
    return unit.execute(state)
