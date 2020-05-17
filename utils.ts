import { extname } from "https://deno.land/std/path/mod.ts";
import { ServerRequest } from "https://deno.land/std/http/server.ts";
import {
  blue,
  bold,
  green,
  red,
} from "https://deno.land/std/fmt/colors.ts";
import mimes from "./mimes.ts";
import notFound from "./404.ts";

/* CLI Utils */

export const isValidArg = (arg: string): boolean => {
  const args = ["_", "h", "n", "s", "d", "p", "t"];
  return args.includes(arg);
};

export const isValidPort = (port: any): boolean =>
  port >= 1 && port <= 65535 && Number.isInteger(port);

/* Server utils */

export const contentType = (path: string): string => {
  const ext = String(extname(path)).toLowerCase();
  return mimes[ext] || "application/octet-stream";
};

export const isRoute = (path: string) => {
  const last = path.split("/").pop();
  return last && !~last.indexOf(".");
};

export const readFile = async (filename: string) => {
  const decoder = new TextDecoder();
  return decoder.decode(await Deno.readFile(filename));
};

export const isWebSocket = (req: ServerRequest): boolean =>
  req.headers.get("upgrade") === "websocket";

export const appendReloadScript = (
  file: string,
  port: number,
  secure: boolean,
): string => {
  const protocol = secure ? "wss" : "ws";
  return file + `<script>
  const socket = new WebSocket('${protocol}://localhost:${port}');
  socket.onopen = () => {
    console.log('Socket connection open. Listening for events.');
  };
  socket.onmessage = (msg) => {
    if (msg.data === 'reload') location.reload(true);
  };
</script>`;
};

export const inject404 = (filename: string) => notFound(filename);

/* Print utils */
export const printRequest = (req: ServerRequest): void => {
  console.log(`${bold(green(req.method))} ${req.url}`);
};

export const printHelp = (): void => {
  console.log(`\n
  ${bold(green("🦕  🚚 Denoliver - Help"))}

  OPTIONS | <default>
  -h -- Help
  -p -- Port | 8080
  -n -- Live Reload | true
  -s -- Silent | false
  -d -- Debug | false
  -t -- Use HTTPS - Requires trusted self signed certificate | false
  `);
};

export const printStart = (port: number, secure: boolean): void => {
  const tcp = secure ? "https" : "http";
  console.log(
    `\n
  ${bold(green("🦕  🚚 Denoliver"))}

  ${bold(blue(`Serving on ${tcp}://localhost:${port}`))}
  `,
  );
};

export const error = (msg: string) => {
  console.log(`${bold(red(`\nERROR: ${msg}`))}`);
};

export const warn = (msg: string) => {
  console.log(`${bold(blue(`\nWARN: ${msg}`))}`);
};

export const info = (msg: string) => {
  console.log(`${bold(green(`\nINFO: ${msg}`))}`);
};
