"""Tests for the greeter module."""

from src.greeter import Greeter


def test_greet_with_name():
    greeter = Greeter()
    assert greeter.greet("World") == "Hello, World!"


def test_greet_default():
    greeter = Greeter()
    assert greeter.greet() == "Hello, World!"
