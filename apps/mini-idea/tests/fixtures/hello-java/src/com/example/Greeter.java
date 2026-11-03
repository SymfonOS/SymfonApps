package com.example;

/** Builds a greeting line. */
public class Greeter {
    private final String salutation;

    public Greeter(String salutation) {
        this.salutation = salutation;
    }

    /** Returns "salutation, name!". */
    public String greet(String name) {
        return salutation + ", " + name + "!";
    }

    public String greetAll(java.util.List<String> names) {
        return String.join("\n", names.stream().map(this::greet).toList());
    }
}
