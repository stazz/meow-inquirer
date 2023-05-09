/**
 * @file This is entrypoint file to the package, exporting all non-internal content.
 */
import * as createCLIArgsImport from "./cli-args";
import * as collectInputImport from "./collect-input";
import printImport from "./print";
import type * as inputSpec from "./input-spec";

export const createCLIArgs = createCLIArgsImport.default;
export const collectInput = collectInputImport.default;
export const print = printImport;

export type * from "./input-spec";
export type * from "./cli-args";
export type * from "./collect-input";

/**
 * In most cases, this function will be the only one to be used from this package.
 * It will parse CLI arguments according to the given {@link inputSpec.InputSpec}, prompt the missing arguments from user, and then validate the final result.
 *
 * If there is a need to decompose these two actions, see {@link createCLIArgs} and {@link collectInput}.
 * @param param0 The parameters for {@link createCLIArgs} and {@link collectInput}.
 * @param param0.inputValidator Privately deconstructed property.
 * @param param0.getDynamicValueInput Private deconstructed property.
 * @returns The validated input, and deduced package root.
 */
export const createCLIArgsAndCollectInput = async <
  TInputSpec extends inputSpec.InputSpecBase,
  TValidatedInput,
>({
  inputValidator,
  getDynamicValueInput,
  ...args
}: createCLIArgsImport.GetCLIArgsParameters<TInputSpec> &
  Omit<
    collectInputImport.BuildValidatedInputParameters<
      TInputSpec,
      TValidatedInput
    >,
    "cliArgs"
  >) => {
  const { cliArgs, packageRoot } = await createCLIArgs(args);
  return {
    validatedInput: collectInput(args.inputSpec)({
      cliArgs,
      inputValidator,
      getDynamicValueInput,
    }),
    packageRoot,
  };
};
