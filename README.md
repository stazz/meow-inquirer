# Meow-Inquirer
The `meow-inquirer` package combines the CLI-argument-parsing capabilities of [`meow`](https://www.npmjs.com/package/meow) and user-prompting capabilities of [`inquirer`](https://www.npmjs.com/package/inquirer) packages.
The current implementation is quite opinionated as it also provides some uncustomizable printing functionality.
The runtime validation framework is also currently fixed to be [`@effect/schema`](https://www.npmjs.com/package/@effect/schema).
Both of the opinions may (likely) become customizable later.

The philosophy behind this package is to define one place where the shape of the input is defined in an somewhat abstract way.
This shape is then given to this package, and it will collect what it can from CLI arguments, and prompt for the rest from user.
As a result, the user of this package receives the validated object, and thus can proceed to actual purpose of the code (s)he is writing.

# Usage
TODO
