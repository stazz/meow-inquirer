# Meow-Inquirer
The `meow-inquirer` package combines the CLI-argument-parsing capabilities of [`meow`](https://www.npmjs.com/package/meow) and user-prompting capabilities of [`inquirer`](https://www.npmjs.com/package/inquirer) packages.
The current implementation is quite opinionated as it also provides some uncustomizable printing functionality.
The runtime validation framework is also currently fixed to be [`@effect/schema`](https://www.npmjs.com/package/@effect/schema).
Both of the opinions may (likely) become customizable later.

The philosophy behind this package is to define one place where the shape of the input is defined in an somewhat abstract way.
This shape is then given to this package, and it will collect what it can from CLI arguments, and prompt for the rest from user.
As a result, the user of this package receives the validated object, and thus can proceed to actual purpose of the code (s)he is writing.

# Usage
Most of the times using `createCLIArgsAndCollectInput` is the way to use this library:
```ts
import * as mi from "meow-inquirer";
import * as S from "@effect/schema/Schema";

const inputSpec = {
  // This simple example just has one parameter
  parameter: {
    // This is the parameter validation spec (as opposed to specifying message to be printed to user, see library docs for more info)
    type: mi.TYPE_VALIDATE,
    // The properties of inputSpec will be iterated using orderNumber provided here
    orderNumber: 0,
    // The final type of the parameter
    schema: S.string,
    // The type of 'prompt' is DistinctQuestion from "inquirer" module
    prompt: {
      type: "input",
      message: "Please enter value for parameter",
    },
  }
}
// This line is important!
// It will make custom type out of shape of 'inputSpec', while still making sure that it adhers to InputSpec of "meow-inquirer" library!
as const satisfies mi.InputSpec;

// Calling this will use "meow" library to parse the CLI arguments,
// and print auto-generated help message and exit if `--help` specified.
// Otherwise, the "parameter" CLI flag is attempted to be extracted.
// If it is not passed, the user will be prompted for its value using "prompt"
// object as shown above.
// Finally, a validated object of type { parameter: string } is returned, along with package root directory.
const { validatedInput, packageRoot } = await mi.createCLIArgsAndCollectInput({
  // The input specification declared above
  inputSpec,
  // The import.meta of this module
  importMeta: import.meta,
  // We don't use dynamic values in this simple example
  getDynamicValueInput: () => undefined,
  // For this simple example, it is enough to return schema-validated input as-is
  inputValidator: (input) => Promise.resolve(input),
});
```

For more complex examples, feel free to check [documentation of `InputSpec` type](./src/input-spec.ts), take a look how it is used in `@ty-ras/start` library [here](https://github.com/ty-ras/meta/blob/main/start/src/write/input-spec.mts) and [here](https://github.com/ty-ras/meta/blob/main/start/src/initialize/input-spec.mts), or just explore the library by examining JSDoc and code via [npm package](https://npmjs.com/package/meow-inquirer).