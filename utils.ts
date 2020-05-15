import { extname } from "https://deno.land/std/path/mod.ts";
import mimes from "./mimes.ts";

export const contentType = (path: string): string =>
  mimes[String(extname(path)).toLowerCase()] || "application/octet-stream";

export const isRoute = (path: string) => {
  const last = path.split("/").pop();
  return last && !~last.indexOf(".");
};
