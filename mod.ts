#!/usr/bin/env -S deno run --allow-net
const { args } = Deno;
import { parse, Args } from "https://deno.land/std/flags/mod.ts";
import { acceptWebSocket } from "https://deno.land/std/ws/mod.ts";
import {
  listenAndServe,
  ServerRequest,
} from "https://deno.land/std/http/server.ts";

import {
  isRoute,
  contentType,
  isValidArg,
  printHelp,
  readFile,
  isWebSocket,
  injectReloadScript,
  printStart,
  printRequest,
  printError,
  printArgError,
  isValidPort,
} from "./utils.ts";

/* Initialize file watcher */
let watcher: AsyncIterableIterator<Deno.FsEvent>;

/* Parse CLI args */
const parsedArgs = parse(args);
const root = parsedArgs._ ? String(parsedArgs._[0]) : ".";
const debug = parsedArgs.d;
const silent = parsedArgs.s;
const reload = parsedArgs.n ? false : true;
const port = parsedArgs.p ? parsedArgs.p : 8080;

const handleFileRequest = async (req: ServerRequest) => {
  try {
    const path = root + req.url;
    const file = await Deno.open(path);
    return req.respond({
      status: 200,
      headers: new Headers({
        "content-type": contentType(path),
      }),
      body: file,
    });
  } catch (error) {
    !silent && printError(error, debug);
  }
};

const handleRouteRequest = async (req: ServerRequest): Promise<void> => {
  const file = await readFile(`${root}/index.html`);
  req.respond({
    status: 200,
    headers: new Headers({
      "content-type": "text/html",
    }),
    body: reload ? injectReloadScript(file, port) : file,
  });
};

const handleWs = async (req: ServerRequest): Promise<void> => {
  if (!watcher) {
    watcher = Deno.watchFs(root, { recursive: true });
  }
  try {
    const { conn, r: bufReader, w: bufWriter, headers } = req;
    const socket = await acceptWebSocket(
      { conn, bufReader, bufWriter, headers },
    );

    for await (const event of watcher) {
      if (event.kind === "modify") {
        await socket.send("reload");
      }
    }
  } catch (error) {
    !silent && printError(error, debug);
  }
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

const router = async (req: ServerRequest): Promise<void> => {
  printRequest(req);
  if (reload && isWebSocket(req)) {
    return await handleWs(req);
  }
  try {
    const path = root + req.url;

    if (isRoute(path)) {
      return handleRouteRequest(req);
    }

    if (req.method === "GET" && req.url === "/") {
      return handleRouteRequest(req);
    }
    return handleFileRequest(req);
  } catch (error) {
    !silent && printError(error, debug);
    handleError(req);
  }
};

const main = async (args: Args) => {
  Object.keys(args).map((arg: string) => {
    if (arg === "h") {
      printHelp();
      Deno.exit();
    }
    if (!isValidArg(arg)) {
      printArgError(arg, "is not a valid flag");
      printHelp();
      Deno.exit();
    }

    if (args.p && !isValidPort(args.p)) {
      printArgError(args.p, "is not a valid port");
      Deno.exit();
    }
  });

  listenAndServe({ port }, router);
  printStart(port);
};

if (import.meta.main) {
  main(parsedArgs);
}
