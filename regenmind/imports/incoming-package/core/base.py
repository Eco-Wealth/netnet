
class BaseUnit:
    def execute(self, state):
        raise NotImplementedError("Each unit must implement execute()")
