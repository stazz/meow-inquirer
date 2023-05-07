import createCLIArgsImport from "./cli-args";
import collectInputImport from "./collect-input";
import printImport from "./print";

export const createCLIArgs = createCLIArgsImport;
export const collectInput = collectInputImport;
export const print = printImport;

export type * from "./input-spec";
export type * from "./cli-args";
export type * from "./collect-input";
