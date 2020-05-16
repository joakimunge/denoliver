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
} from "./utils.ts";

/* Initialize file watcher */
let watcher: AsyncIterableIterator<Deno.FsEvent>;

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
  const file = await readFile(`${root}/index.html`);
  console.log(file);
  req.respond({
    status: 200,
    headers: new Headers({
      "content-type": "text/html",
    }),
    body: file + `<script>
    const socket = new WebSocket('ws://localhost:8080');
    socket.onopen = () => {
      console.log('Socket connection open. Listening for events.');
    };
    socket.onmessage = (msg) => {
      if (msg.data === 'reload') location.reload(true);
    };
  </script>`,
  });
};

const handleWs = async (req: ServerRequest): Promise<void> => {
  if (!watcher) {
    watcher = Deno.watchFs(root, { recursive: true });
  }
  try {
    const { conn, r: bufReader, w: bufWriter, headers } = req;
    const sock = await acceptWebSocket({ conn, bufReader, bufWriter, headers });

    for await (const event of watcher) {
      if (event.kind === "modify") {
        await sock.send("reload");
      }
    }
  } catch (error) {
    console.log(error);
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

const watchFiles = async () => {
  const watcher = Deno.watchFs(root, { recursive: true });
  for await (const event of watcher) {
  }
};

const router = async (req: ServerRequest): Promise<void> => {
  await handleWs(req);
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
