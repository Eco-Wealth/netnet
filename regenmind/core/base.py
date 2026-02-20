class BaseUnit:
    def __init__(self):
        pass

    def execute(self, state):
        raise NotImplementedError("Subclasses must implement execute()")
