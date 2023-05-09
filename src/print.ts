/**
 * @file This file contains helper function to print a message to console as default export.
 */
/**
 * Helper function to print a message to console using given level.
 * @param msg The message to print
 * @param level The level to use.
 * @returns void.
 */
export default (msg: string, level: "info" | "warn" | "error" = "info") =>
  // eslint-disable-next-line no-console
  console[level](msg);
