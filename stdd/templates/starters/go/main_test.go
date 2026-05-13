package main

import "testing"

func TestGreetWithName(t *testing.T) {
	g := &Greeter{}
	got := g.Greet("World")
	want := "Hello, World!"
	if got != want {
		t.Errorf("Greet() = %q, want %q", got, want)
	}
}

func TestGreetDefault(t *testing.T) {
	g := &Greeter{}
	got := g.Greet("")
	want := "Hello, World!"
	if got != want {
		t.Errorf("Greet() = %q, want %q", got, want)
	}
}
