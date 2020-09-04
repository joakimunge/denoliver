const { args } = Deno
import { parse } from 'https://deno.land/std/flags/mod.ts'
import { acceptWebSocket } from 'https://deno.land/std/ws/mod.ts'
import {
  serve,
  Server,
  serveTLS,
  ServerRequest,
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
  pipe,
} from './utils/utils.ts'

import { html, css, logo } from './utils/boilerplate.ts'
import { getNetworkAddr } from './utils/local-ip.ts'
import dirTemplate from './directory.ts'
import { InterceptorException } from './utils/errors.ts'

type DenoliverOptions = {
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
  before?: string | Interceptor | Interceptor[]
  after?: string | Interceptor | Interceptor[]
}

type Interceptor = (r: ServerRequest) => ServerRequest

/* Initialize file watcher */
let watcher: AsyncIterableIterator<Deno.FsEvent>

/* Server */
let server: Server
let networkAddr: string | undefined

/* Globals */
let root = '.'
let port = 8080
let debug = false
let silent = false
let disableReload = false
let secure = false
let help = false
let cors = false
let list = false
let certFile = 'denoliver.crt'
let keyFile = 'denoliver.key'
let entryPoint = 'index.html'
let before: Array<Interceptor> | Interceptor
let after: Array<Interceptor> | Interceptor

const handleFileRequest = async (req: ServerRequest) => {
  try {
    const path = joinPath(root, req.url)
    const file = await Deno.open(path)
    req.done.then(() => {
      file.close()
    })
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
  try {
    if (!(req instanceof ServerRequest)) {
      throw new InterceptorException()
    }
    printRequest(req)
    if (!disableReload && isWebSocket(req)) {
      return await handleWs(req)
    }
    if (req.method === 'GET' && req.url === '/') {
      return handleRouteRequest(req)
    }
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
    err instanceof InterceptorException && Deno.exit()
  }
}

const checkCredentials = async () => {
  try {
    await Deno.stat(`${root}/${certFile}`)
    await Deno.stat(`${root}/${keyFile}`)
  } catch (err) {
    !silent && debug
      ? console.error(err)
      : error(
          'Could not certificate or key files. Make sure you have your CERT_FILE.crt & KEY_FILE.key in your working directory, or try without -t.'
        )
    Deno.exit()
  }
}

const callInterceptors = (
  req: ServerRequest,
  funcs: Interceptor[] | Interceptor
) => {
  const fns = Array.isArray(funcs) ? funcs : [funcs]
  const pipeline = pipe(...fns)
  return pipeline(req)
}

const startListener = async (
  handler: (req: ServerRequest) => void
): Promise<void> => {
  try {
    for await (const req of server) {
      before ? handler(await callInterceptors(req, before)) : handler(req)
      after && callInterceptors(req, after)
    }
  } catch (err) {
    !silent && debug ? console.error(err) : error(err.message)
  }
}

const setGlobals = async (args: DenoliverOptions): Promise<void> => {
  root = args.root ?? '.'
  help = args.help ?? false
  debug = args.debug ?? false
  silent = args.silent ?? false
  disableReload = args.disableReload ?? false
  port = args.port ?? 8080
  secure = args.secure ?? false
  cors = args.cors ?? false
  list = args.list ?? false
  certFile = args.certFile ?? 'denoliver.crt'
  keyFile = args.keyFile ?? 'denoliver.key'
  entryPoint = args.entryPoint ?? 'index.html'

  if (args.before) {
    if (typeof args.before === 'function') {
      before = args.before
    } else {
      try {
        const path = posix.resolve(`${root}/${args.before}`)
        const interceptors = await import(path)
        before = interceptors.default
      } catch (err) {
        !silent && debug ? console.error(err) : error(err.message)
      }
    }
  }

  if (args.after) {
    if (typeof args.after === 'function') {
      before = args.after
    } else {
      try {
        const path = posix.resolve(`${root}/${args.after}`)
        const interceptors = await import(path)
        after = interceptors.default
      } catch (err) {
        !silent && debug ? console.error(err) : error(err.message)
      }
    }
  }
}

const makeBoilerplate = async (path: string, name: string) => {
  await Deno.mkdir(`${path}/${name}`, { recursive: true })
  const htmlData = encode(html(name))
  const cssData = encode(css())
  const svgData = encode(logo())

  await Deno.writeFile(`${path}/${name}/index.html`, htmlData)
  await Deno.writeFile(`${path}/${name}/index.css`, cssData)
  await Deno.writeFile(`${path}/${name}/logo.svg`, svgData)
  await Deno.writeFile(`${path}/${name}/app.js`, encode(''))
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
        certFile: `${root}/${certFile}`,
        keyFile: `${root}/${keyFile}`,
      })
    : serve({ port })

  networkAddr = await getNetworkAddr()
  printStart(root, port, networkAddr, secure)

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
      l: false,
      certFile: 'denoliver.crt',
      keyFile: 'denoliver.key',
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

  await setGlobals({
    root: parsedArgs._.length > 0 ? String(parsedArgs._[0]) : '.',
    debug: parsedArgs.d,
    silent: parsedArgs.s,
    disableReload: parsedArgs.n,
    port: parsedArgs.p,
    secure: parsedArgs.t,
    help: parsedArgs.h,
    cors: parsedArgs.c,
    list: parsedArgs.l,
    certFile: parsedArgs.certFile,
    keyFile: parsedArgs.keyFile,
    entryPoint: parsedArgs.entry,
    before: parsedArgs.before,
    after: parsedArgs.after,
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
