import { extname } from 'https://deno.land/std/path/mod.ts'
import { ServerRequest } from 'https://deno.land/std/http/server.ts'
import { blue, bold, green, red } from 'https://deno.land/std/fmt/colors.ts'
import mimes from '../mimes.ts'
import notFound from '../404.ts'

/* CLI Utils */

export const isValidArg = (arg: string): boolean => {
  const args = [
    '_',
    'h',
    'n',
    's',
    'd',
    'p',
    't',
    'c',
    'l',
    'keyFile',
    'certFile',
    'entry',
    'before',
    'after',
  ]
  return args.includes(arg)
}

export const isValidPort = (port: any): boolean =>
  port >= 1 && port <= 65535 && Number.isInteger(port)

export const prompt = async (body = '') => {
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

export const joinPath = (root: string, url: string): string => root + url

export const contentType = (path: string): string => {
  const ext = String(extname(path)).toLowerCase()
  return mimes[ext] || 'application/octet-stream'
}

export const isRoute = (path: string) => {
  const withoutTrailing = path.replace(/\/+$/, '')
  const last = withoutTrailing.split('/').pop()
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
  secure: boolean
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

export const pipe = <R>(...fns: Array<(a: R) => R>) => (arg: R) => {
  if (fns.length === 0) {
    throw new Error('Expected at least one argument function')
  }
  return fns.reduce(
    (prevFn, nextFn) => prevFn.then(nextFn),
    Promise.resolve(arg)
  )
}

/* Print utils */
export const printRequest = (req: ServerRequest): void => {
  console.log(`${bold(green(req.method))} ${req.url}`)
}

export const printHelp = (): void => {
  console.log(`\n
  ${bold(green('🦕  🚚 Denoliver - Help'))}

  OPTIONS    
  -h          # Help
  -p          # Port | ${bold(blue('8080'))}
  -n          # Disable Live Reload | ${bold(blue('false'))}
  -s          # Silent | ${bold(blue('false'))}
  -d          # Debug | ${bold(blue('false'))}
  -t          # Use HTTPS - Requires trusted self signed certificate | ${bold(
    blue('false')
  )}
  -c          # Allow CORS | ${bold(blue('false'))}
  -l          # Use Directory Listings (Disables SPA routing) | ${bold(
    blue('false')
  )}
  --certFile  # Specify certificate file - ${bold(blue('denoliver.crt'))}
  --keyFile   # Specify certificate file - ${bold(blue('denoliver.key'))}
  --entry     # Specify entrypoint | ${bold(blue('index.html'))}
  `)
}

export const printStart = (
  root: string,
  port: number,
  networkAddr: string | undefined,
  secure?: boolean
): void => {
  const tcp = secure ? 'https' : 'http'
  const networkPrint = `${tcp}://${networkAddr}:${port}`
  console.clear()
  console.log(
    `\n
  ${bold(green('🦕  🚚 Denoliver'))}

  Now serving ${bold(root)}:

      ${bold('Local:')}      ${tcp}://localhost:${port}
      ${bold('Network:')}    ${
      networkAddr ? networkPrint : 'Could not resolve network address'
    }

  ${
    !networkAddr
      ? `${blue(
          'Denoliver needs permission to spawn a subprocess to access your local network address. If you wish, install it again with the --allow-run flag'
        )}`
      : ''
  }
  `
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

export interface DirEntry extends Deno.DirEntry {
  url: string
}
