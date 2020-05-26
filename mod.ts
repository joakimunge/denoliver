const { args } = Deno
import { parse } from 'https://deno.land/std/flags/mod.ts'
import { acceptWebSocket } from 'https://deno.land/std/ws/mod.ts'
import {
  ServerRequest,
  serve,
  Server,
  serveTLS,
} from 'https://deno.land/std/http/server.ts'

/* Denoliver utils */
import {
  isRoute,
  isValidArg,
  printHelp,
  readFile,
  isWebSocket,
  appendReloadScript,
  printStart,
  printRequest,
  error,
  isValidPort,
  inject404,
  setHeaders,
} from './utils.ts'

/* Initialize file watcher */
let watcher: AsyncIterableIterator<Deno.FsEvent>

/* Server */
let server: Server

/* Globals */
let root: string = '.'
let port: number = 8080
let debug: boolean = false
let silent: boolean = false
let disableReload: boolean = false
let secure: boolean = false
let help: boolean = false
let cors: boolean = false
let entryPoint: string = 'index.html'

const handleFileRequest = async (req: ServerRequest) => {
  try {
    const path = root + req.url
    const file = await Deno.open(path)
    return req.respond({
      status: 200,
      headers: setHeaders(cors, path),
      body: file,
    })
  } catch (err) {
    !silent && debug ? console.error(err) : error(err.message)
    handleNotFound(req)
  }
}

const handleRouteRequest = async (req: ServerRequest): Promise<void> => {
  const file = await readFile(`${root}/${entryPoint}`)
  const { hostname, port } = req.conn.localAddr as Deno.NetAddr
  req.respond({
    status: 200,
    headers: setHeaders(cors),
    body: disableReload
      ? file
      : appendReloadScript(file, port, hostname, secure),
  })
}

const handleWs = async (req: ServerRequest): Promise<void> => {
  if (!watcher) {
    watcher = Deno.watchFs(root, { recursive: true })
  }
  try {
    const { conn, r: bufReader, w: bufWriter, headers } = req
    const socket = await acceptWebSocket({
      conn,
      bufReader,
      bufWriter,
      headers,
    })

    for await (const event of watcher) {
      if (event.kind === 'modify') {
        await socket.send('reload')
      }
    }
  } catch (err) {
    !silent && error(err.message)
  }
}

const handleNotFound = async (req: ServerRequest): Promise<void> => {
  return req.respond({
    status: 404,
    headers: setHeaders(cors),
    body: inject404(req.url),
  })
}

const router = async (req: ServerRequest): Promise<void> => {
  printRequest(req)
  if (!disableReload && isWebSocket(req)) {
    return await handleWs(req)
  }
  try {
    const path = root + req.url

    if (isRoute(path)) {
      return handleRouteRequest(req)
    }

    if (req.method === 'GET' && req.url === '/') {
      return handleRouteRequest(req)
    }
    return handleFileRequest(req)
  } catch (err) {
    !silent && debug ? console.log(err) : error(err.message)
  }
}

const checkCredentials = async () => {
  try {
    await Deno.stat(`${root}/denoliver.crt`)
    await Deno.stat(`${root}/denoliver.key`)
  } catch (err) {
    !silent && debug
      ? console.error(err)
      : error(
          'Could not certificate or key files. Make sure you have denoliver.crt & denoliver.key in your working directory, or try without -t.',
        )
    Deno.exit()
  }
}

const startListener = async (
  handler: (req: ServerRequest) => void,
): Promise<void> => {
  try {
    for await (const req of server) {
      handler(req)
    }
  } catch (err) {
    !silent && debug ? console.error(err) : error(err.message)
  }
}

const setGlobals = (args: DenoliverOptions): void => {
  root = args.root ?? '.'
  debug = args.debug ?? false
  silent = args.silent ?? false
  disableReload = args.disableReload ?? false
  port = args.port ?? 8080
  secure = args.secure ?? false
  cors = args.cors ?? false
  entryPoint = args.entryPoint ?? 'index.html'
}

interface DenoliverOptions {
  root?: string
  port?: number
  silent?: boolean
  disableReload?: boolean
  debug?: boolean
  cors?: boolean
  secure?: boolean
  help?: boolean
  entryPoint?: string
}

/**
 * Serve a directory over HTTP/HTTPS
 *
 *     const options = { port: 8000, cors: true };
 *     const denoliver = await main(options)
 *
 * @param options Optional server config
 */
const main = async (args?: DenoliverOptions): Promise<Server> => {
  if (args) {
    setGlobals(args)
  }

  if (help) {
    printHelp()
    Deno.exit()
  }

  if (port && !isValidPort(port)) {
    error(`${port} is not a valid port.`)
    Deno.exit()
  }

  secure && (await checkCredentials())

  // In certain browsers the server will crash if Self-signed certificates are not allowed.
  // Ref: https://github.com/denoland/deno/issues/5760
  server = secure
    ? serveTLS({
        port: port,
        certFile: `${root}/denoliver.crt`,
        keyFile: `${root}/denoliver.key`,
      })
    : serve({ port })

  console.log('Denoliver v1.0.0')
  printStart(port, secure)
  startListener(router)
  return server
}

if (import.meta.main) {
  const parsedArgs = parse(args, {
    default: {
      d: false,
      s: false,
      n: false,
      p: 8080,
      t: false,
      c: false,
      entry: 'index.html',
    },
  })

  Object.keys(parsedArgs).map((arg: string) => {
    if (!isValidArg(arg)) {
      error(`${arg} is not a valid arg.`)
      printHelp()
      Deno.exit()
    }
  })

  setGlobals({
    root: parsedArgs._.length > 0 ? String(parsedArgs._[0]) : '.',
    debug: parsedArgs.d,
    silent: parsedArgs.s,
    disableReload: parsedArgs.n,
    port: parsedArgs.p,
    secure: parsedArgs.t,
    help: parsedArgs.h,
    cors: parsedArgs.c,
    entryPoint: parsedArgs.entry,
  })

  main()
}

export default main
