#!/usr/bin/env -S deno run --allow-net
const { args } = Deno;
import { parse, Args } from "https://deno.land/std/flags/mod.ts";
import { acceptWebSocket } from "https://deno.land/std/ws/mod.ts";
import {
  listenAndServe,
  listenAndServeTLS,
  ServerRequest,
} from "https://deno.land/std/http/server.ts";

import {
  isRoute,
  contentType,
  isValidArg,
  printHelp,
  readFile,
  isWebSocket,
  appendReloadScript,
  printStart,
  printRequest,
  warn,
  error,
  isValidPort,
  inject404,
} from "./utils.ts";

/* Initialize file watcher */
let watcher: AsyncIterableIterator<Deno.FsEvent>;

/* Parse CLI args */
const parsedArgs = parse(args);
const root = parsedArgs._.length > 0 ? String(parsedArgs._[0]) : ".";
const debug = parsedArgs.d || false
const silent = parsedArgs.s || false
const reload = parsedArgs.n || true
const port = parsedArgs.p ? parsedArgs.p : 8080;
const secure = parsedArgs.t || false

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
  } catch (err) {
    !silent && debug ? console.log(err) : error(err.message);
    handleNotFound(req);
  }
};

const handleRouteRequest = async (req: ServerRequest): Promise<void> => {
  const file = await readFile(`${root}/index.html`);
  req.respond({
    status: 200,
    headers: new Headers({
      "content-type": "text/html",
    }),
    body: reload ? appendReloadScript(file, port, secure) : file,
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
  } catch (err) {
    !silent && error(err.message);
  }
};

const handleNotFound = async (
  req: ServerRequest,
): Promise<void> => {
  return req.respond({
    status: 404,
    body: inject404(req.url),
  });
};

const router = async (req: ServerRequest): Promise<void> => {
  printRequest(req);
  if(reload && isWebSocket(req)) {
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
  } catch (err) {
    !silent && debug ? console.log(err) : error(err.message);
  }
};

const checkCredentials = async () => {
  try {
    await Deno.stat(`${root}/denoliver.crt`)
    await Deno.stat(`${root}/denoliver.key`)

  } catch(err) {
    !silent && debug ? console.error(err) : error("Could not certificate or key files. Make sure you have denoliver.crt & denoliver.key in your working directory, or try without -t.");
    Deno.exit()
  }
}

const main = async (args: Args) => {
  Object.keys(args).map((arg: string) => {
    if (arg === "h") {
      printHelp();
      Deno.exit();
    }
    if (!isValidArg(arg)) {
      error(`${arg} is not a valid flag.`);
      printHelp();
      Deno.exit();
    }

    if (args.p && !isValidPort(args.p)) {
      error(`${args.p} is not a valid port.`);
      Deno.exit();
    }
  });

  secure && await checkCredentials()
  
  secure ? listenAndServeTLS({ port, certFile: `${root}/denoliver.crt`, keyFile: `${root}/denoliver.key` }, router) : listenAndServe({ port }, router);
  
  printStart(port);
};

if (import.meta.main) {
  main(parsedArgs);
}

export default main;
