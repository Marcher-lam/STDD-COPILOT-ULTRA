"""Greeter module."""


class Greeter:
    """Simple greeter class."""

    def greet(self, name: str | None = None) -> str:
        return f"Hello, {name or 'World'}!"
