import { extname } from 'https://deno.land/std/path/mod.ts'
import { ServerRequest } from 'https://deno.land/std/http/server.ts'
import { blue, bold, green, red } from 'https://deno.land/std/fmt/colors.ts'
import mimes from '../mimes.ts'
import notFound from '../404.ts'

/* CLI Utils */

export const isValidArg = (arg: string): boolean => {
  const args = ['_', 'h', 'n', 's', 'd', 'p', 't', 'c', 'entry']
  return args.includes(arg)
}

export const isValidPort = (port: any): boolean =>
  port >= 1 && port <= 65535 && Number.isInteger(port)

export const prompt = async (body: string = '') => {
  const buf = new Uint8Array(1024)
  await Deno.stdout.write(encode(`${bold(green(`\n${body}`))}`))
  const n = (await Deno.stdin.read(buf)) as number
  const answer = decode(buf.subarray(0, n))
  return answer.trim()
}

/* Encode / Decode */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const encode = (x: string) => encoder.encode(x)
export const decode = (x: Uint8Array) => decoder.decode(x)

/* Server utils */

export const contentType = (path: string): string => {
  const ext = String(extname(path)).toLowerCase()
  return mimes[ext] || 'application/octet-stream'
}

export const isRoute = (path: string) => {
  const last = path.split('/').pop()
  return last && !~last.indexOf('.')
}

export const readFile = async (filename: string) => {
  const decoder = new TextDecoder()
  return decoder.decode(await Deno.readFile(filename))
}

export const isWebSocket = (req: ServerRequest): boolean =>
  req.headers.get('upgrade') === 'websocket'

export const setHeaders = (cors: boolean, path?: string): Headers => {
  const headers = new Headers()
  path
    ? headers.set('content-type', contentType(path))
    : headers.set('content-type', 'text/html')
  cors && headers.set('Access-Control-Allow-Origin', '*')
  return headers
}

export const appendReloadScript = (
  file: string,
  port: number,
  hostname: string,
  secure: boolean,
): string => {
  const protocol = secure ? 'wss' : 'ws'
  return (
    file +
    `<script>
  const socket = new WebSocket('${protocol}://${hostname}:${port}');
  socket.onopen = () => {
    console.log('Socket connection open. Listening for events.');
  };
  socket.onmessage = (msg) => {
    if (msg.data === 'reload') location.reload(true);
  };
</script>`
  )
}

export const inject404 = (filename: string) => notFound(filename)

/* Print utils */
export const printRequest = (req: ServerRequest): void => {
  console.log(`${bold(green(req.method))} ${req.url}`)
}

export const printHelp = (): void => {
  console.log(`\n
  ${bold(green('🦕  🚚 Denoliver - Help'))}

  OPTIONS | <default>
  -h -- Help
  -p -- Port | 8080
  -n -- Disable Live Reload | false
  -s -- Silent | false
  -d -- Debug | false
  -t -- Use HTTPS - Requires trusted self signed certificate | false
  -c -- Allow CORS | false
  --entry -- Specify entrypoint | index.html
  `)
}

export const printStart = (
  root: string,
  port: number,
  secure?: boolean,
): void => {
  const tcp = secure ? 'https' : 'http'
  console.log(
    `\n
  ${bold(green('🦕  🚚 Denoliver'))}

  ${bold(blue(`Serving ${root} on ${tcp}://localhost:${port}`))}
  
  `,
  )
}

export const error = (msg: string) => {
  console.log(`${bold(red(`\nERROR: ${msg}`))}`)
}

export const warn = (msg: string) => {
  console.log(`${bold(blue(`\nWARN: ${msg}`))}`)
}

export const info = (msg: string) => {
  console.log(`${bold(green(`\n${msg}`))}`)
}
