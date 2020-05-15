import { extname } from "https://deno.land/std/path/mod.ts";
import mimes from "./mimes.ts";

export const contentType = (path: string): string => {
  const ext = String(extname(path)).toLowerCase();
  return mimes[ext] || "application/octet-stream";
};

export const isRoute = (path: string) => {
  const last = path.split("/").pop();
  return last && !~last.indexOf(".");
};

export const isValidArg = (arg: string): boolean => {
  const args = ["_", "h", "n"];
  return args.includes(arg);
};

export const printHelp = (): void => {
  console.log(
    `Deno Server - Help

  OPTIONS
  -h -- Help
  -n -- Disable live reload
  `,
  );
};
