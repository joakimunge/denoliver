const { args } = Deno
import { parse } from 'https://deno.land/std/flags/mod.ts'
import { acceptWebSocket } from 'https://deno.land/std/ws/mod.ts'
import {
  ServerRequest,
  serve,
  Server,
  serveTLS,
} from 'https://deno.land/std/http/server.ts'
import { posix } from 'https://deno.land/std/path/mod.ts'

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
  encode,
  decode,
  info,
  prompt,
  joinPath,
  DirEntry,
} from './utils/utils.ts'

import { html, css } from './utils/boilerplate.ts'
import dirTemplate from './directory.ts'

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
let list: boolean = false
let certFile: string = 'denoliver'
let keyFile: string = 'denoliver'
let entryPoint: string = 'index.html'

const handleFileRequest = async (req: ServerRequest) => {
  try {
    const path = joinPath(root, req.url)
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
  try {
    const file = await readFile(`${root}/${entryPoint}`)
    const { hostname, port } = req.conn.localAddr as Deno.NetAddr
    req.respond({
      status: 200,
      headers: setHeaders(cors),
      body: disableReload
        ? file
        : appendReloadScript(file, port, hostname, secure),
    })
  } catch (err) {
    !silent && debug ? console.error(err) : error(err.message)
    handleDirRequest(req)
  }
}

const handleDirRequest = async (req: ServerRequest): Promise<void> => {
  const path = joinPath(root, req.url)
  const dirUrl = `/${posix.relative(root, path)}`
  const entries: DirEntry[] = []
  for await (const entry of Deno.readDir(path.replace(/\/$/, ''))) {
    const filePath = posix.join(dirUrl, '/', entry.name)
    entries.push({ ...entry, url: decodeURIComponent(filePath) })
  }

  req.respond({
    status: 200,
    body: encode(dirTemplate(entries, dirUrl)),
    headers: setHeaders(cors),
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
  if (req.method === 'GET' && req.url === '/') {
    return handleRouteRequest(req)
  }
  try {
    const path = joinPath(root, req.url)
    if (isRoute(path)) {
      if (list) {
        try {
          const fileInfo = await Deno.stat(path)

          if (fileInfo.isDirectory) {
            return handleDirRequest(req)
          }
        } catch (err) {
          throw err
        }
      }
      return handleRouteRequest(req)
    }

    return handleFileRequest(req)
  } catch (err) {
    err instanceof Deno.errors.NotFound && handleNotFound(req)
    !silent && debug ? console.log(err) : error(err.message)
  }
}

const checkCredentials = async () => {
  try {
    await Deno.stat(`${root}/${certFile}.crt`)
    await Deno.stat(`${root}/${keyFile}.key`)
  } catch (err) {
    !silent && debug
      ? console.error(err)
      : error(
          'Could not certificate or key files. Make sure you have your CERT_FILE.crt & KEY_FILE.key in your working directory, or try without -t.'
        )
    Deno.exit()
  }
}

const startListener = async (
  handler: (req: ServerRequest) => void
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
  list = args.list ?? false
  certFile = args.certFile ?? 'denoliver'
  keyFile = args.keyFile ?? 'denoliver'

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
  list?: boolean
  certFile?: string
  keyFile?: string
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
        certFile: `${root}/${certFile}.crt`,
        keyFile: `${root}/${keyFile}.key`,
      })
    : serve({ port })

  printStart(root, port, secure)
  startListener(router)
  return server
}

const makeBoilerplate = async (path: string, name: string) => {
  await Deno.mkdir(`${path}/${name}`, { recursive: true })
  const htmlData = encode(html(name))
  const cssData = encode(css())
  await Deno.writeFile(`${path}/${name}/index.html`, htmlData)
  await Deno.writeFile(`${path}/${name}/index.css`, cssData)
  await Deno.writeFile(`${path}/${name}/app.js`, encode(''))
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
      l: false,
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
    list: parsedArgs.l,
    entryPoint: parsedArgs.entry,
  })

  try {
    const config = await Deno.readFile(`${root}/denoliver.json`)
    setGlobals(JSON.parse(decode(config)))
  } catch (err) {}

  const cwd = Deno.cwd()
  try {
    Deno.readDirSync(`${cwd}/${root}`)
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      const answer = await prompt(
        `The directory ${root} does not exist. Do you wish to create it? [y/n]`
      )
      if (answer === 'y' || 'Y') {
        await makeBoilerplate(cwd, root)
      } else {
        info('Exiting.')
        Deno.exit()
      }
    }
  }

  main()
}

export default main
