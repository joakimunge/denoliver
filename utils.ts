import { extname } from "https://deno.land/std/path/mod.ts";
import mimes from "./mimes.ts";
import { ServerRequest } from "https://deno.land/std/http/server.ts";

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

export const readFile = async (filename: string) => {
  const decoder = new TextDecoder();
  return decoder.decode(await Deno.readFile(filename));
};

export const isWebSocket = (req: ServerRequest): boolean =>
  req.headers.get("upgrade") === "websocket";

export const injectReloadScript = (file: string): string => {
  return file + `<script>
  const socket = new WebSocket('ws://localhost:8080');
  socket.onopen = () => {
    console.log('Socket connection open. Listening for events.');
  };
  socket.onmessage = (msg) => {
    if (msg.data === 'reload') location.reload(true);
  };
</script>`;
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
