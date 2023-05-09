/**
 * @file This file contains types used when defining input specification used by other functions of this library.
 * @see {@link InputSpec}
 */
import type * as S from "@effect/schema/Schema";
import type * as F from "@effect/data/Function";
import { type AnyFlag } from "meow";
import { type DistinctQuestion } from "inquirer";

/**
 * This type defines type which should be used when defining input specification with `satisfies` keyword.
 * @example
 * For example, this constant will define input specification, which contains one property called `parameter` of type `string`, which can be either specified as CLI argument, or asked from user:
 * ```ts
 * import * as mi from "meow-inquirer";
 * import * as S from "@effect/schema/Schema";
 *
 * export const inputSpec = {
 *   parameter: {
 *     type: mi.TYPE_VALIDATE,
 *     orderNumber: 0,
 *     schema: S.string,
 *     prompt: {
 *       type: "input",
 *       message: "Please enter value for parameter",
 *     },
 *   }
 * } as const satisfies mi.InputSpec;
 * ```
 * After this, it is possible to call `createCLIArgsAndCollectInput` like this:
 * ```ts
 * const validatedInput = await mi.createCLIArgsAndCollectInput({
 *   // The input specification declared above
 *   inputSpec,
 *   // The import.meta of this module
 *   importMeta: import.meta,
 *   // We don't use dynamic values in this simple example
 *   getDynamicValueInput: () => undefined,
 *   // For this simple example, it is enough to return schema-validated input as-is
 *   inputValidator: (input) => Promise.resolve(input),
 * });
 * ```
 * The `validatedInput` will be now of type `{ parameter: string }`, and the value would've come either from CLI argument, or by prompting the user using `prompt` spec (which is question spec of `inquirer` module).
 *
 * The input specification scales onwards to more complex things - here is example from `@ty-ras/start` project:
 * ```ts
 * const inputSpec = {
 *   // A general message about starting to query for project configuration
 *   generalMessage: {
 *     type: mi.TYPE_MESSAGE,
 *     orderNumber: 0,
 *     message: chalk.bold.bgBlueBright("# General project configuration"),
 *   },
 *   // Target folder where to write the project
 *   folderName: {
 *     type: mi.TYPE_VALIDATE,
 *     orderNumber: 1,
 *     // String, but with additional transformation to absolute path
 *     schema: F.pipe(
 *       S.string,
 *       S.nonEmpty({ title: "Folder as non-empty string." }),
 *       // change path given via cmd args / user input to absolute
 *       S.transform(
 *         S.string,
 *         (rawPath) => path.resolve(rawPath),
 *         (absolutePath) => path.relative(absolutePath, process.cwd()),
 *       ),
 *     ),
 *     // Prompt specification when asked from user
 *     prompt: {
 *       type: "input",
 *       message: "Where should the project be created?",
 *       default: "./my-project",
 *     },
 *     // Notice the lack of 'flag' property -> this means that the folder name is taken from positional CLI arguments.
 *   },
 *   // Which package manager the project will be using
 *   packageManager: {
 *     type: mi.TYPE_VALIDATE,
 *     orderNumber: 2,
 *     // We allow only one of the three, or let the user decide later
 *     schema: S.keyof(
 *       S.struct({ yarn: S.any, npm: S.any, pnpm: S.any, unspecified: S.any }),
 *     ),
 *     // Prompt specification when asked from user
 *     prompt: {
 *       type: "list",
 *       message: "Which package manager will be used in the project?",
 *       default: "yarn",
 *       choices: [
 *         { name: "Yarn", value: "yarn" },
 *         { name: "NPM", value: "npm" },
 *         { name: "PNPM", value: "pnpm" },
 *         {
 *           name: "Decide on your own after project creation",
 *           value: "unspecified",
 *         },
 *       ],
 *     },
 *     // CLI flag specification
 *     flag: {
 *       type: "string",
 *       isRequired: false,
 *       shortFlag: "m",
 *     },
 *   },
 * }
 * ```
 */
export type InputSpec<TDynamicValueInput = never> = Record<
  string,
  InputSpecProperty<TDynamicValueInput>
>;

/**
 * This type defines a base type for most of the other types and functions in this library.
 *
 * To see how to define a type which adhers to this base constraint, see example of {@link InputSpec} type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InputSpecBase = InputSpec<any>;

/**
 * This type represents specification of single property within input specification.
 * @see {@link InputSpec}
 */
export type InputSpecProperty<TDynamicValueInput> =
  | StateMutatingSpec<TDynamicValueInput>
  | MessageSpec<TDynamicValueInput>;

/**
 * This interface contains properties which are common for all instances of {@link InputSpecProperty}.
 */
export interface CommonSpec {
  /**
   * The order number of this spec.
   * The specs will be processed in ascending order number.
   */
  orderNumber: number;
}

/**
 * This interface contains properties which constitute input property spec, which mutates the intermediate input spec object, by taking value either from CLI argument, or by prompting from user.
 */
export interface StateMutatingSpec<TDynamicValueInput> extends CommonSpec {
  /**
   * The discriminating type union -property which identifies this as instruction to parse property from CLI arg or prompt from user, and then validate it.
   */
  type: typeof TYPE_VALIDATE;
  /**
   * The prompt specification, if value for this property spec will need to be prompted from user.
   * @see DistinctQuestion
   */
  prompt: DistinctQuestion;
  /**
   * The CLI flag, if value for this property spec can be taken from CLI flag.
   * If omitted, it is assumed that value can be taken from unflagged CLI arguments.
   * @see AnyFlag
   */
  flag?: AnyFlag;
  /**
   * The runtime validation for the value, which comes from CLI argument or user prompt.
   * Notice that this is allowed to do transformation, e.g. timestamp string to Date object.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: S.Schema<any>;
  /**
   * Optional condition when this spec should be used.
   * @see ConditionWithDescription
   */
  condition?: ConditionWithDescription<TDynamicValueInput>;
}

/**
 * This interface defines the shape of the condition which will be evaluated during input validation process.
 * If condition is present in {@link StateMutatingSpec}, it will be evaluated, and processing the specification will be skipped if `isApplicable` callback returns `false`.
 */
export interface ConditionWithDescription<TDynamicValueInput> {
  /**
   * Description of this condition.
   * Will be used when generating help text.
   */
  description: string;
  /**
   * Callback to determine whether the {@link StateMutatingSpec} containing this condition should be skipped.
   * If returns `true`, then the spec will be used.
   * Otherwise, the spec will be skipped.
   */
  isApplicable: DynamicValue<TDynamicValueInput, boolean>;
}

/**
 * This interface contains properties which constitute printing message, without actually mutating input spec object.
 */
export interface MessageSpec<TDynamicValueInput> extends CommonSpec {
  /**
   * The discriminating type union -property which identifies this as instruction to print message.
   */
  type: typeof TYPE_MESSAGE;
  /**
   * The message to print.
   * Can be either string value, or a callback to get the string value.
   * If callback returns `undefined`, printing the message will be skipped.
   */
  message: string | DynamicValue<TDynamicValueInput, string | undefined>;
}

/**
 * Generic callback type for getting output from certain input.
 */
export type DynamicValue<TInput, TOutput> = F.FunctionN<[TInput], TOutput>;

/**
 * Helper type to extract the generic argument of type materializing {@link InputSpec}.
 */
export type GetDynamicValueInput<TInputSpec extends InputSpecBase> =
  TInputSpec extends InputSpec<infer TDynamicValueInput>
    ? TDynamicValueInput
    : never;

export const TYPE_VALIDATE = "validate";
export const TYPE_MESSAGE = "message";
