/**
 * @file This file contains function and type definitions used when collecting the final, fully validated input object, from CLI arguments and/or prompting from user.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import chalk from "chalk";
import { type AnyFlag } from "meow";
import inquirer, { type DistinctQuestion, type PromptModule } from "inquirer";
import * as F from "@effect/data/Function";
import * as E from "@effect/data/Either";
import * as R from "@effect/data/ReadonlyRecord";
import * as A from "@effect/data/ReadonlyArray";
import * as N from "@effect/data/Number";
import * as O from "@effect/data/Option";
import * as Set from "@effect/data/HashSet";
import * as Ord from "@effect/data/typeclass/Order";
import * as S from "@effect/schema/Schema";
import * as TF from "@effect/schema/TreeFormatter";
import * as Match from "@effect/match";
import print from "./print";
import type * as cliArgs from "./cli-args";
import * as inputSpec from "./input-spec";

/**
 * Binds to a given input specification, returning callback which will perform the actual input building - either from CLI arguments, prompting from user, or a combination of both.
 * @param spec The input specification.
 * @returns The callback performing actual input object building, bound to given input spec.
 * @see {@link BuildValidatedInput}
 * @see {@link inputSpec.InputSpecBase}
 */
export default <TInputSpec extends inputSpec.InputSpecBase>(
    spec: TInputSpec,
  ): BuildValidatedInput<TInputSpec> =>
  async ({
    cliArgs: cliArgsParam,
    inputValidator,
    getDynamicValueInput,
    promptModule,
  }) => {
    // Then, collect the inputs - use CLI args or prompt from user
    // Keep collecting until all inputs pass validation
    let cliArgs: CLIArgsInfo<TInputSpec> = cliArgsParam;
    let input: InputFromCLIOrUser<TInputSpec> = {};
    let validatedInput: GetValidatedInput<typeof inputValidator> | undefined;
    if (!promptModule) {
      promptModule = defaultPrompt;
    }
    do {
      // Get the inputs from CLI args or user prompt
      // On first loop, the 'input' will be empty and all the things will be checked/asked.
      // On subsequent loops (if any), only the errored properties will be missing, and thus checked/asked again.
      const cliArgsSet: Set.HashSet<CLIArgsInfoSetElement<TInputSpec>> =
        await collectInput(
          promptModule,
          spec,
          cliArgs,
          input,
          getDynamicValueInput,
        );
      // Validate the inputs in a way that template creation part knows
      const validationResult = await inputValidator(input);
      if (Array.isArray(validationResult)) {
        // When there are errors, notify user and adjust 'input' variable.
        for (const [valueName, errorMessage] of validationResult) {
          // Notify user about the error
          print(
            chalk.redBright(
              `Error for "${String(valueName)}":\n${errorMessage}\n`,
            ),
          );
          // Delete it so that collectInputs would ask for it again
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          delete (input as any)[valueName];
        }
        if (!Set.isHashSet(cliArgs)) {
          cliArgs = cliArgsSet;
        }
      } else if (typeof validationResult === "string") {
        // This signifies internal error, as at this point the input itself is structurally invalid
        // Clear everything and start asking from clean slate
        print(
          chalk.red(
            `There has been an internal error when collecting input.\nIgnoring all CLI flags from now on, and starting to collect input from beginning.\nError message: ${validationResult}`,
          ),
        );
        cliArgs = { flags: {}, input: [] };
        input = {};
      } else {
        validatedInput = validationResult;
      }
    } while (validatedInput === undefined);
    return validatedInput;
  };

/**
 * This callback will asynchronously create the validated input.
 * For that, it will take the necessary data from {@link cliArgs.CLIArgs}, the name of the dynamic value callback parameter, and the callback to perform final validation.
 *
 * If CLI args contain, or the user gives input, which is deemed to be invalid by the given `inputValidator`, the user will be re-prompted to give the values until the validator accepts them.
 * @see {@link CLIArgsResult}
 * @see {@link InputValidator}
 * @see {@link inputSpec.InputSpecBase}
 */
export type BuildValidatedInput<TInputSpec extends inputSpec.InputSpecBase> = <
  TValidatedInput,
>(
  args: BuildValidatedInputParameters<TInputSpec, TValidatedInput>,
) => Promise<TValidatedInput>;

/**
 * This type represents arguments of callbak type {@link BuildValidatedInput}.
 */
export type BuildValidatedInputParameters<
  TInputSpec extends inputSpec.InputSpecBase,
  TValidatedInput,
> = {
  /**
   * The information about parsed CLI arguments, typically obtained via calling {@link cliArgs}.
   */
  cliArgs: CLIArgsResult<TInputSpec>;
  /**
   * The callback to perform final validation when all the properties have been parsed from CLI args and/or prompted from user.
   */
  inputValidator: InputValidator<TInputSpec, TValidatedInput>;

  /**
   * The callback to get dynamic value input.
   */
  getDynamicValueInput: GetDynamicValueArg<TInputSpec>;

  /**
   * Override the {@link PromptModule} used to prompt the value from user..
   * Notice that default value is NOT {@link inquirer.prompt}, but instead a prompt module which has its `skipTTYChecks` set to `false`.
   * If that is not done, passing non-tty input to process will cause inquirer to silently exit the process with exit code `0`.
   * For more information, see https://github.com/SBoudrias/Inquirer.js/issues/495 .
   */
  promptModule?: PromptModule;
};

/**
 * This type represents callback to get parameter for {@link cliArgs.DynamicValue}
 */
export type GetDynamicValueArg<TInputSpec extends inputSpec.InputSpecBase> = (
  values: InputFromCLIOrUser<TInputSpec>,
) => inputSpec.GetDynamicValueInput<TInputSpec> | undefined;

/**
 * This callback is used to perform the final validation of the input, after iterating the CLI arguments and prompting the value from user, if needed.
 * It takes the unvalidated input as argument, and either:
 *
 * - Asynchronously returns validated input,
 * - Synchronously returns error message, which is interpreted as internal error, and causes wiping of CLI arguments and starting prompting from user from clean slate, or
 * - Asynchronously returns errors related to certain parts of the input, causing the error message to be displayed, and re-prompting for valid values from user.
 * @see {@link InputFromCLIOrUser}
 */
export type InputValidator<
  TInputSpec extends inputSpec.InputSpecBase,
  TValidatedInput,
> = (
  input: InputFromCLIOrUser<TInputSpec>,
) =>
  | string
  | Promise<
      | TValidatedInput
      | Array<readonly [keyof InputFromCLIOrUser<TInputSpec>, string]>
    >;

/**
 * This type represents data which has been collected from CLI or prompted from user, and should be validated.
 * @see {@link InputValidator}
 */
export type InputFromCLIOrUser<TInputSpec extends inputSpec.InputSpecBase> =
  Partial<{
    -readonly [P in SchemaKeys<TInputSpec>]: TInputSpec[P] extends inputSpec.ValidationSpec<
      infer _
    >
      ? S.To<TInputSpec[P]["schema"]>
      : never;
  }>;

/**
 * This type represents the necessary data required from {@link cliArgs.CLIArgs} in order to construct final validated input object.
 */
export type CLIArgsResult<TInputSpec extends inputSpec.InputSpecBase> =
  Readonly<Pick<cliArgs.CLIArgs<TInputSpec>["cliArgs"], "flags" | "input">>;

/**
 * This type represents all the names of the given input spec which have validation schema associated with them.
 * @see {@link inputSpec.InputSpecBase}
 * @see {@link inputSpec.ValidationSpec}
 */
export type SchemaKeys<TInputSpec extends inputSpec.InputSpecBase> = {
  [P in keyof TInputSpec]: TInputSpec[P] extends inputSpec.ValidationSpec<
    infer _
  >
    ? P
    : never;
}[keyof TInputSpec];

const collectInput = async <TInputSpec extends inputSpec.InputSpecBase>(
  promptModule: PromptModule,
  spec: TInputSpec,
  cliArgs: CLIArgsInfo<TInputSpec>,
  values: InputFromCLIOrUser<TInputSpec>,
  getDynamicValueInput: GetDynamicValueArg<TInputSpec>,
): Promise<Set.HashSet<CLIArgsInfoSetElement<TInputSpec>>> => {
  let dynamicValueInput: O.Option<inputSpec.GetDynamicValueInput<TInputSpec>> =
    O.fromNullable(getDynamicValueInput(values));
  let cliArgsSet = Set.make<ReadonlyArray<CLIArgsInfoSetElement<TInputSpec>>>();
  for (const [stageName, stageInfo] of getInputSpecOrdered(spec)) {
    if (!(stageName in values)) {
      F.pipe(
        Match.value(
          O.fromNullable(
            await handleStage(
              promptModule,
              stageName,
              stageInfo,
              cliArgs,
              dynamicValueInput,
            ),
          ),
        ),
        Match.when(O.isSome, ({ value: { value, fromCLI } }) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          values[stageName as keyof typeof values] = value;
          if (O.isNone(dynamicValueInput)) {
            dynamicValueInput = O.fromNullable(getDynamicValueInput(values));
          }
          if (fromCLI) {
            cliArgsSet = Set.add(
              cliArgsSet,
              stageName as CLIArgsInfoSetElement<TInputSpec>,
            );
          }
        }),
        // End pattern matching
        Match.option,
      );
    }
  }
  return cliArgsSet;
};

const getInputSpecOrdered = <TInputSpec extends inputSpec.InputSpecBase>(
  stages: TInputSpec,
) =>
  F.pipe(
    stages,
    R.toEntries,
    A.sort(
      F.pipe(
        N.Order,
        Ord.contramap(
          (
            stage: [
              string,
              inputSpec.InputSpecProperty<
                inputSpec.GetDynamicValueInput<TInputSpec>
              >,
            ],
          ) => stage[1].orderNumber,
        ),
      ),
    ),
  );

const handleStage = async <TInputSpec extends inputSpec.InputSpecBase>(
  promptModule: PromptModule,
  valueName: keyof TInputSpec,
  stage: inputSpec.InputSpecProperty<
    inputSpec.GetDynamicValueInput<TInputSpec>
  >,
  cliArgs: CLIArgsInfo<TInputSpec>,
  components: O.Option<inputSpec.GetDynamicValueInput<TInputSpec>>,
) => {
  const maybeResult = await F.pipe(
    Match.value(stage),
    Match.when(
      (
        stage,
      ): stage is inputSpec.MessageSpec<
        inputSpec.GetDynamicValueInput<TInputSpec>
      > => stage.type === "message",
      (stage): Promise<O.Option<Promise<StageHandlingResult<TInputSpec>>>> =>
        Promise.resolve(handleStageMessage(stage, components)),
    ),
    Match.orElse(
      (stage): Promise<O.Option<Promise<StageHandlingResult<TInputSpec>>>> =>
        handleStageStateMutation(
          promptModule,
          valueName,
          stage,
          cliArgs,
          components,
        ),
    ),
  );
  return O.getOrNull(maybeResult);
};

const handleStageMessage = <TInputSpec extends inputSpec.InputSpecBase>(
  {
    message,
  }: inputSpec.MessageSpec<inputSpec.GetDynamicValueInput<TInputSpec>>,
  components: O.Option<inputSpec.GetDynamicValueInput<TInputSpec>>,
): O.Option<Promise<StageHandlingResult<TInputSpec>>> =>
  F.pipe(
    // Start pattern matching on message
    Match.value(message),
    // If message is plain string, then use it as-is
    Match.when(Match.string, F.identity),
    // Otherwise, message is a function -> invoke it to get the actual message
    Match.orElse((message) => message(O.getOrThrow(components))),
    // Wrap the result of pattern match (string | undefined) to perform another match
    Match.value,
    // If string -> print the message as side-effect
    Match.when(Match.string, (str) => print(str)),
    // Finalize 2nd matching, otherwise it will never get executed
    Match.option,
    O.none,
  );

// The asyncness here is not handled particularly nicely
// I'm not quite sure how @effect -umbrella libs will handle that eventually.
// FP-TS had Tasks, but @effect seems to lack those, and use the fiber-based Effect thingy.
// I guess that works too, but pairing that with newer stuff like pattern matching etc doesn't seem to be quite intuitive at least.
const handleStageStateMutation = async <
  TInputSpec extends inputSpec.InputSpecBase,
>(
  promptModule: PromptModule,
  valueName: keyof TInputSpec,
  {
    condition,
    schema,
    flag,
    prompt,
  }: inputSpec.ValidationSpec<inputSpec.GetDynamicValueInput<TInputSpec>>,
  cliArgs: CLIArgsInfo<TInputSpec>,
  components: O.Option<inputSpec.GetDynamicValueInput<TInputSpec>>,
): Promise<O.Option<Promise<StageHandlingResult<TInputSpec>>>> => {
  const isApplicable = await F.pipe(
    // Match the condition
    Match.value(condition),
    // If condition is not specified, then it is interpreted as true
    Match.when(Match.undefined, F.constTrue),
    // Otherwise, condition is a function -> invoke it to get the actual boolean value
    Match.orElse(({ isApplicable }) => isApplicable(O.getOrThrow(components))),
  );
  return F.pipe(
    isApplicable,
    // Start new pattern matching, which will perform the actual state mutation
    Match.value,
    // If the condition pattern match evaluated to true, proceed
    Match.when(true, () =>
      F.pipe(
        // Try to get the value from CLI flags or args
        getValueFromCLIFlagsOrArgs(String(valueName), schema, flag, cliArgs),
        // Start next pattern matching
        Match.value,
        // When value is not set, or is invalid (= undefined), then prompt value from user
        Match.when(O.isNone, async () => ({
          value: await promptValueFromUser(promptModule, schema, prompt),
          fromCLI: false,
        })),
        // If valid value was in CLI flags or args, use it as-is
        Match.orElse(({ value }) => Promise.resolve({ value, fromCLI: true })),
      ),
    ),
    // Else if the condition pattern match evaluated to string, print the string
    Match.orElse(
      F.flow(
        Match.value,
        Match.when(Match.string, (message) => (print(message), undefined)),
        Match.orElse(() => undefined),
      ),
    ),
    O.fromNullable,
  );
};

const getValueFromCLIFlagsOrArgs = <TInputSpec extends inputSpec.InputSpecBase>(
  valueName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: S.Schema<any>,
  flag: AnyFlag | undefined,
  cliArgs: CLIArgsInfo<TInputSpec>,
): O.Option<StageValues<TInputSpec>> =>
  F.pipe(
    Match.value(cliArgs),
    // Current version of @effect/schema has a bug with this
    // So we just use unknown for now and then explicit cast...
    Match.when(Set.isHashSet, (cliArgsNames: unknown) => {
      if (
        Set.has(
          cliArgsNames as Set.HashSet<CLIArgsInfoSetElement<TInputSpec>>,
          valueName as CLIArgsInfoSetElement<TInputSpec>,
        )
      ) {
        // The value was specified via CLI, but failed more advanced validation
        print(
          chalk.bold.cyanBright(
            `Not re-using CLI-supplied value for "${valueName}" after error.`,
          ),
        );
      }
      return O.none<StageValues<TInputSpec> | undefined>();
    }),
    Match.orElse<
      InternalCLIArgsResult<TInputSpec>,
      O.Option<StageValues<TInputSpec> | undefined>
    >(({ flags, input }) =>
      F.pipe(
        // Match the value either from flags, or from unnamed CLI args
        Match.value<StageValues<TInputSpec> | undefined>(
          flag ? flags[valueName as keyof typeof flags] : input[0],
        ),
        // If value was specified (is not undefined)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Match.not(Match.undefined, (value: any) =>
          F.pipe(
            // Is the value adhering to the schema?
            Match.value(S.is(schema)(value)),
            // If value adhers to schema, we can use it.
            // Notify user about this.
            Match.when(true, () => {
              // Side-effect: notify user that instead of prompting, the value from CLI will be used
              print(
                chalk.italic(
                  `Using value supplied via CLI for "${valueName}" (${value}).`,
                ),
              );
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return value as StageValues<TInputSpec>;
            }),
            // If value does not adher to schema, we should not use it.
            // Notify user about this.
            Match.orElse(() => {
              // Side-effect: notify that value specified via CLI arg was not valid
              print(
                chalk.bold.cyanBright(
                  `! The value specified as CLI ${
                    flag ? `parameter "${valueName}"` : "argument"
                  } was not valid, proceeding to prompt for it.`,
                ),
                "warn",
              );
              // Continue as if value was not set
              return undefined;
            }),
          ),
        ),
        (matcher): O.Option<StageValues<TInputSpec> | undefined> =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
          Match.option(matcher) as any,
      ),
    ),
    // At this point we have O.Option<StageValues | undefined>
    // And we want to end up with O.Option<StageValues>
    // So we need to do a little dancing with O.Options (especially since at least for now there is no .chain for any of @effect/data structures.)
    O.map(O.fromNullable),
    O.flatten,
  );

const promptValueFromUser = <TInputSpec extends inputSpec.InputSpecBase>(
  promptModule: PromptModule,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: S.Schema<any>,
  prompt: DistinctQuestion,
) =>
  F.pipe(
    // Construct schema decoder
    S.decodeEither(schema),
    // Prompt the value from user, using schema decoder as validator
    async (decode) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      (
        await promptModule<{
          question: StageValues<TInputSpec>;
        }>({
          ...prompt,
          name: "question",
          validate: (input) =>
            // We could use F.flow here, but the signature of decode is not compatible with validate
            F.pipe(
              input,
              // Use decoder to validate input
              decode,
              // On success, just return true
              E.map(constTrue),
              // On error, return string with nicely formatted error message
              E.getOrElse(({ errors }) => TF.formatErrors(errors)),
            ),
        })
      ).question,
  );

// The constTrue in @effect/data/Function is of type F.LazyArg<boolean> while here we need F.LazyArg<true>
const constTrue: F.LazyArg<true> = () => true;

type CLIArgsInfo<TInputSpec extends inputSpec.InputSpecBase> =
  | InternalCLIArgsResult<TInputSpec>
  | Set.HashSet<CLIArgsInfoSetElement<TInputSpec>>;

type InternalCLIArgsResult<TInputSpec extends inputSpec.InputSpecBase> = Omit<
  CLIArgsResult<TInputSpec>,
  "flags"
> & {
  flags: Partial<CLIArgsResult<TInputSpec>["flags"]>;
};

type CLIArgsInfoSetElement<TInputSpec extends inputSpec.InputSpecBase> =
  | cliArgs.FlagKeys<TInputSpec>
  | CLIInputsKey<TInputSpec>;

type CLIInputsKey<TInputSpec extends inputSpec.InputSpecBase> = {
  [P in keyof TInputSpec]: TInputSpec[P] extends {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    schema: S.Schema<infer _>;
    flag?: never;
  }
    ? P
    : never;
}[keyof TInputSpec];

type StageHandlingResult<TInputSpec extends inputSpec.InputSpecBase> = {
  value: StageValues<TInputSpec>;
  fromCLI: boolean;
};

type SchemasOfStages<TInputSpec extends inputSpec.InputSpecBase> = {
  [P in keyof TInputSpec]: TInputSpec[P] extends inputSpec.ValidationSpec<
    infer _
  >
    ? TInputSpec[P]["schema"]
    : never;
}[keyof TInputSpec];

type StageValues<TInputSpec extends inputSpec.InputSpecBase> = S.To<
  SchemasOfStages<TInputSpec>
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GetValidatedInput<TValidator extends InputValidator<any, any>> =
  TValidator extends InputValidator<infer _, infer TValidatedInput>
    ? TValidatedInput
    : never;

const defaultPrompt = inquirer.createPromptModule({
  // If we don't do this, when the process is invoked with `< /dev/null`, the inquirer will simply silently exit with code 0
  // We don't want that - instead we want an error to be thrown
  // See for more info: https://github.com/SBoudrias/Inquirer.js/issues/495
  skipTTYChecks: false,
});
