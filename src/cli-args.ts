/**
 * @file This file contains code related to invoking `meow` to parse arguments, with help text generated from input specification.
 */
import meow, { type AnyFlag, type Result } from "meow";
import * as readPkgUp from "read-pkg-up";
import * as F from "@effect/data/Function";
import * as O from "@effect/data/Option";
import * as AST from "@effect/schema/AST";
import * as url from "node:url";
import * as path from "node:path";
import type * as inputSpec from "./input-spec";

/**
 * Generates help text from given input specification, and parses arguments using `meow` library.
 * Returns result of the parsing, along with package root (directory of resolved package.json file) used.
 * @param root0 The {@link GetCLIArgsParameters} acting as input for this function.
 * @param root0.importMeta Deconstructed property.
 * @param root0.inputSpec Deconstructed property.
 * @returns The {@link CLIArgs} with parsed CLI argument information, along with the deduced package root.
 * @throws If resolving package root fails, or meow parsing throws.
 */
export default async <TInputSpec extends inputSpec.InputSpecBase>({
  importMeta,
  inputSpec,
}: GetCLIArgsParameters<TInputSpec>): Promise<CLIArgs<TInputSpec>> => {
  // From: https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/
  const pkgUpCwd = url.fileURLToPath(new URL(".", importMeta.url));
  // Resolve package root
  const { packageJson, path: packageRoot } = F.pipe(
    await readPkgUp.readPackageUp({
      cwd: pkgUpCwd,
    }),
    O.fromNullable,
    O.getOrThrowWith(
      () => new Error(`Failed to read package.json from "${pkgUpCwd}".`),
    ),
  );

  // Parse CLI arguments and pass generated help text.
  const parsedArgs = meow(getHelpText(packageJson.name, inputSpec), {
    importMeta,
    flags: getFlags(inputSpec),
    booleanDefault: undefined,
    autoVersion: true,
    autoHelp: true,
  });
  // Return parse result along with package root
  return { cliArgs: parsedArgs, packageRoot: path.dirname(packageRoot) };
};

/**
 * This interface represents necessary data needed to collect CLI arguments.
 */
export interface GetCLIArgsParameters<
  TInputSpec extends inputSpec.InputSpecBase,
> {
  /**
   * The {@link ImportMeta} of the package calling this function.
   */
  importMeta: ImportMeta;
  /**
   * The input specification, containing information about flags and prompting. See {@link inputSpec.InputSpecBase} for more information.
   */
  inputSpec: TInputSpec;
}

/**
 * This interface encapsulates result of {@link meow} invocation, along with resolved root path of the package which called this library.
 */
export interface CLIArgs<TInputSpec extends inputSpec.InputSpecBase> {
  /**
   * The result of {@link meow} invocation.
   */
  cliArgs: Result<Flags<TInputSpec>>;
  /**
   * The root path of the package which invoked this library.
   */
  packageRoot: string;
}

/**
 * This is helper type to extract all the flags specified by given input spec.
 */
export type Flags<TInputSpec extends inputSpec.InputSpecBase> = {
  [P in FlagKeys<TInputSpec>]: TInputSpec[P] extends { flag: AnyFlag }
    ? TInputSpec[P]["flag"]
    : never;
};

/**
 * This is helper type to get all the keys of given input spec, which have a CLI flag specification.
 */
export type FlagKeys<TInputSpec extends inputSpec.InputSpecBase> = {
  [P in keyof TInputSpec]: TInputSpec[P] extends { flag: AnyFlag } ? P : never;
}[keyof TInputSpec] &
  string;

const getFlags = <TInputSpec extends inputSpec.InputSpecBase>(
  stages: TInputSpec,
) =>
  Object.fromEntries(
    Object.entries(stages)
      .filter(
        (
          tuple,
        ): tuple is [
          FlagKeys<TInputSpec>,
          inputSpec.InputSpecProperty<unknown> & { flag: AnyFlag },
        ] => "flag" in tuple[1],
      )
      .map(([key, { flag }]) => [key, flag] as const),
  ) as Flags<TInputSpec>;

const schemaToHelpText = (ast: AST.AST): string => {
  switch (ast._tag) {
    case "Union":
      return ast.types.map(schemaToHelpText).join("|");
    case "Literal":
      return typeof ast.literal === "string"
        ? `"${ast.literal}"`
        : `${ast.literal}`;
    case "BooleanKeyword":
      return "boolean";
    case "NumberKeyword":
      return "number";
    default:
      throw new Error(`Unrecognized AST: ${ast._tag}`);
  }
};

const getHelpText = <TInputSpec extends inputSpec.InputSpecBase>(
  packageName: string,
  stages: TInputSpec,
) => `
  Usage: npx ${packageName}@latest [options...] [folder]

  All options and folder are optional as command-line arguments.
  If any of them is omitted, the program will prompt for their values.
  Options:
    ${Object.entries(stages)
      .filter(
        (
          tuple,
        ): tuple is [
          string,
          inputSpec.ValidationSpec<unknown> & { flag: AnyFlag },
        ] => "flag" in tuple[1],
      )
      .map(
        ([
          name,
          {
            flag: { shortFlag },
            prompt: { message },
            schema,
            condition,
          },
        ]) =>
          `--${name}, -${shortFlag}\t${message}${
            condition === undefined
              ? ""
              : `\n          ${condition.description}`
          }\n          Schema: ${schemaToHelpText(schema.ast)}`,
      )
      .join("\n    ")}
`;
