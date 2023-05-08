/**
 * @file This file contains unit tests for file `../input-spec.ts`.
 */
import test from "ava";
// import * as S from "@effect/schema/Schema";
// import type * as spec from "../input-spec";
// import type * as collectInput from "../collect-input";

test("This tests does nothing for now", (c) => c.pass());

// const cliArgs: collectInput.CLIArgsResult<any> = { flags: {}, input: [] };
// const schema = S.string;
// const prompt = {};
// const orderNumber = 0;

// const emptyInputSpec = {} as const satisfies spec.InputSpec;
// const emptyInputSpecArgs: collectInput.BuildValidatedInputParameters<
//   typeof emptyInputSpec,
//   never
// > = {
//   cliArgs,
//   inputValidator: () => "",
//   getDynamicValueInput: () => "",
// };

// const oneSimpleInputSpec = {
//   parameter: {
//     orderNumber,
//     schema,
//     prompt,
//   },
// } as const satisfies spec.InputSpec;
// const oneSimpleInputSpecArgs: collectInput.BuildValidatedInputParameters<
//   typeof emptyInputSpec,
//   never
// > = {
//   cliArgs,
//   inputValidator: () => "",
// };

// const oneInputWithDynamicValueWithoutArgsSpec = {
//   parameter: {
//     orderNumber,
//     schema,
//     prompt,
//     condition: {
//       description: "Always",
//       isApplicable: () => true,
//     },
//   },
// } as const satisfies spec.InputSpec;
// const oneInputWithDynamicValueWithoutArgsSpecArgs: collectInput.BuildValidatedInputParameters<
//   typeof oneInputWithDynamicValueWithoutArgsSpec,
//   never
// > = {
//   cliArgs,
//   inputValidator: () => "",
// };

// const oneInputWithDynamicValueWithArgSpec = {
//   parameter: {
//     orderNumber,
//     schema,
//     prompt,
//     condition: {
//       description: "If dynamic input is certain string",
//       isApplicable: (str) => str === "certain string",
//     },
//   },
// } as const satisfies spec.InputSpec<string>;
// const oneInputWithDynamicValueWithArgSpecArgs: collectInput.BuildValidatedInputParameters<
//   typeof oneInputWithDynamicValueWithArgSpec,
//   never
// > = {
//   cliArgs,
//   inputValidator: () => "",
//   getDynamicValueInput: () => 10,
// };
