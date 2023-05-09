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
