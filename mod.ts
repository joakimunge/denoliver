#!/usr/bin/env -S deno run --allow-net
const { args } = Deno;
import { parse, Args } from "https://deno.land/std/flags/mod.ts";
import {
  listenAndServe,
  ServerRequest,
} from "https://deno.land/std/http/server.ts";

import { isRoute, contentType, isValidArg, printHelp } from "./utils.ts";

/* Parse CLI args */
const parsedArgs = parse(args);
const root = parsedArgs._ ? String(parsedArgs._[0]) : ".";

const handleRequest = async (req: ServerRequest) => {
  const path = root + req.url;
  const file = await Deno.open(path);
  return req.respond({
    status: 200,
    headers: new Headers({
      "content-type": contentType(path),
    }),
    body: file,
  });
};

const handleRouteRequest = async (req: ServerRequest): Promise<void> => {
  req.respond({
    status: 200,
    headers: new Headers({
      "content-type": "text/html",
    }),
    body: await Deno.open(`${root}/index.html`),
  });
};

const handleError = async (
  req: ServerRequest,
  status = 404,
  body = "Not Found",
): Promise<void> => {
  return req.respond({
    status,
    body,
  });
};

const watchFiles = async () => {
  const watcher = Deno.watchFs(root, { recursive: true });
  for await (const event of watcher) {
  }
};

const router = async (req: ServerRequest): Promise<void> => {
  try {
    console.log(req.method, req.url);
    const path = root + req.url;

    if (isRoute(path)) {
      return handleRouteRequest(req);
    }

    if (req.method === "GET" && req.url === "/") {
      return handleRouteRequest(req);
    }
    return handleRequest(req);
  } catch (error) {
    console.error(error);
    handleError(req);
  }
};

const main = async (args: Args) => {
  Object.keys(args).map((arg: string) => {
    if (!isValidArg(arg)) {
      console.log(`"${arg}" is not a known flag.`);
      printHelp();
      Deno.exit();
    }
  });

  listenAndServe({ port: 8080 }, router);
  console.log("Serving on localhost:8080");
  if (args.r) {
    watchFiles();
  }
};

if (import.meta.main) {
  main(parsedArgs);
}
