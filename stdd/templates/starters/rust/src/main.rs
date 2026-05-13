pub struct Greeter;

impl Greeter {
    pub fn new() -> Self {
        Greeter
    }

    pub fn greet(&self, name: &str) -> String {
        let name = if name.is_empty() { "World" } else { name };
        format!("Hello, {}!", name)
    }
}

fn main() {
    let greeter = Greeter::new();
    println!("{}", greeter.greet("World"));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greet_with_name() {
        let greeter = Greeter::new();
        assert_eq!(greeter.greet("World"), "Hello, World!");
    }

    #[test]
    fn test_greet_default() {
        let greeter = Greeter::new();
        assert_eq!(greeter.greet(""), "Hello, World!");
    }
}
