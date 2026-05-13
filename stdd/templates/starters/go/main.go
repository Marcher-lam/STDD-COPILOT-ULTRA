package main

import (
	"fmt"
	"os"
)

// Greeter provides greeting functionality.
type Greeter struct{}

// Greet returns a greeting message for the given name.
func (g *Greeter) Greet(name string) string {
	if name == "" {
		name = "World"
	}
	return fmt.Sprintf("Hello, %s!", name)
}

func main() {
	g := &Greeter{}
	fmt.Println(g.Greet("World"))
	os.Exit(0)
}
