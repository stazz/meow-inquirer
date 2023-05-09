/**
 * @file This file contains types used when defining input specification used by other functions of this library.
 * @see {@link InputSpec}
 */
import type * as S from "@effect/schema/Schema";
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
 *   inputSpec,
 *   importMeta: import.meta,
 *   // We don't use dynamic values in this simple example
 *   getDynamicValueInput: () => undefined,
 *   // For this simple example, it is enough to return schema-validated input as-is
 *   inputValidator: (input) => Promise.resolve(input),
 * });
 * ```
 * The `validatedInput` will be now of type `{ parameter: string }`, and the value would've come either from CLI argument, or by prompting the user using `prompt` spec (which is question spec of `inquirer` module).
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
// TODO this maybe needs to be discriminated type union? Current definition allows spec to be both message and state mutating.
export type InputSpecProperty<TDynamicValueInput> = CommonSpec &
  (StateMutatingSpec<TDynamicValueInput> | MessageSpec<TDynamicValueInput>);

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
export interface StateMutatingSpec<TDynamicValueInput> {
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

export interface ConditionWithDescription<TDynamicValueInput> {
  description: string;
  isApplicable: DynamicValue<TDynamicValueInput, boolean>;
}

export interface MessageSpec<TDynamicValueInput> {
  message: string | DynamicValue<TDynamicValueInput, string | undefined>;
}

export type DynamicValue<TInput, TOutput> = (input: TInput) => TOutput;

export type GetDynamicValueInput<TInputSpec extends InputSpecBase> =
  TInputSpec extends InputSpec<infer TDynamicValueInput>
    ? TDynamicValueInput
    : never;
