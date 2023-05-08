/**
 * @file This file contains types used when defining input specification used by other functions of this library.
 * @see {@link InputSpecBase}
 */
import type * as S from "@effect/schema/Schema";
import { type AnyFlag } from "meow";
import { type DistinctQuestion } from "inquirer";

/**
 * This type defines type which should be used when defining input specification with `satisfies` keyword.
 * @example For example, this constant will define input specification, which contains one property called `parameter` of type `string`, which can be either specified as CLI argument, or asked from user:
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

export type InputSpecProperty<TDynamicValueInput> = CommonSpec &
  (StateMutatingSpec<TDynamicValueInput> | MessageSpec<TDynamicValueInput>);

export interface CommonSpec {
  orderNumber: number;
}

export interface StateMutatingSpec<TDynamicValueInput> {
  prompt: DistinctQuestion;
  flag?: AnyFlag;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: S.Schema<any>;
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
