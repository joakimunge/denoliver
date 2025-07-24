const { args } = Deno
import { parse, posix, serve } from './deps.ts'

/* Denoliver utils */
import {
  appendReloadScript,
  decode,
  DirEntry,
  encode,
  error,
  info,
  inject404,
  isRoute,
  isValidArg,
  isValidPort,
  isWebSocket,
  joinPath,
  printHelp,
  printRequest,
  printStart,
  prompt,
  readFile,
  setHeaders,
} from './utils/utils.ts'

import dirTemplate from './directory.ts'
import { css, html, logo } from './utils/boilerplate.ts'
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

type Interceptor = (req: Request) => Request | Promise<Request>

/* Initialize file watcher */
let watcher: Deno.FsWatcher

/* Server */
let _serverPromise: Promise<void> | undefined
let networkAddr: string | undefined

const getNetworkAddr = (): string | undefined => {
  try {
    const interfaces = Deno.networkInterfaces()
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.address.startsWith('127.')) {
        return iface.address
      }
    }
  } catch (err) {
    if (!silent && debug) {
      console.error(
        'Failed to get network address:',
        err instanceof Error ? err.message : String(err)
      )
    }
  }
  return undefined
}

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

const handleFileRequest = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url)
    const path = joinPath(root, url.pathname)
    const file = await Deno.open(path)

    return new Response(file.readable, {
      status: 200,
      headers: setHeaders(cors, path),
    })
  } catch (err) {
    !silent && debug
      ? console.error(err)
      : error(err instanceof Error ? err.message : String(err))
    return handleNotFound(req)
  }
}

const handleRouteRequest = async (req: Request): Promise<Response> => {
  try {
    const file = await readFile(`${root}/${entryPoint}`)
    const url = new URL(req.url)
    const hostname = url.hostname
    const serverPort = url.port
      ? parseInt(url.port)
      : url.protocol === 'https:'
      ? 443
      : 80

    const body = disableReload
      ? file
      : appendReloadScript(file, serverPort, hostname, secure)

    return new Response(body, {
      status: 200,
      headers: setHeaders(cors),
    })
  } catch (err) {
    !silent && debug
      ? console.error(err)
      : error(err instanceof Error ? err.message : String(err))
    return handleDirRequest(req)
  }
}

const handleDirRequest = async (req: Request): Promise<Response> => {
  const url = new URL(req.url)
  const path = joinPath(root, url.pathname)
  const dirUrl = `/${posix.relative(root, path)}`
  const entries: DirEntry[] = []

  try {
    for await (const entry of Deno.readDir(path.replace(/\/$/, ''))) {
      const filePath = posix.join(dirUrl, '/', entry.name)
      entries.push({ ...entry, url: decodeURIComponent(filePath) })
    }

    return new Response(encode(dirTemplate(entries, dirUrl)), {
      status: 200,
      headers: setHeaders(cors),
    })
  } catch (err) {
    !silent && debug
      ? console.error(err)
      : error(err instanceof Error ? err.message : String(err))
    return handleNotFound(req)
  }
}

const handleWs = (req: Request): Response => {
  if (!watcher) {
    watcher = Deno.watchFs(root, { recursive: true })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)

  socket.onopen = () => {
    if (!silent && debug) {
      console.log('WebSocket connection opened')
    }
  }

  socket.onclose = () => {
    if (!silent && debug) {
      console.log('WebSocket connection closed')
    }
  }

  socket.onerror = (err) => {
    if (!silent && debug) {
      console.error('WebSocket error:', err)
    }
  }

  // Watch for file changes and send reload signal
  ;(async () => {
    try {
      for await (const event of watcher) {
        if (event.kind === 'modify' && socket.readyState === WebSocket.OPEN) {
          socket.send('reload')
        }
      }
    } catch (err) {
      !silent && error(err instanceof Error ? err.message : String(err))
    }
  })()

  return response
}

const handleNotFound = (req: Request): Response => {
  const url = new URL(req.url)
  return new Response(inject404(url.pathname), {
    status: 404,
    headers: setHeaders(cors),
  })
}

const router = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url)
    printRequest(req)

    // Handle WebSocket upgrade requests
    if (!disableReload && isWebSocket(req)) {
      return handleWs(req)
    }

    // Handle root route
    if (req.method === 'GET' && url.pathname === '/') {
      return await handleRouteRequest(req)
    }

    const path = joinPath(root, url.pathname)

    if (isRoute(path)) {
      if (list) {
        try {
          const fileInfo = await Deno.stat(path)
          if (fileInfo.isDirectory) {
            return await handleDirRequest(req)
          }
        } catch (_err) {
          // If stat fails, continue to handleRouteRequest
        }
      }
      return await handleRouteRequest(req)
    }

    return await handleFileRequest(req)
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return handleNotFound(req)
    }
    if (err instanceof InterceptorException) {
      Deno.exit()
    }
    !silent && debug
      ? console.log(err)
      : error(err instanceof Error ? err.message : String(err))
    return handleNotFound(req)
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

const callInterceptors = async (
  req: Request,
  funcs: Interceptor[] | Interceptor
): Promise<Request> => {
  const fns = Array.isArray(funcs) ? funcs : [funcs]
  let result = req
  for (const fn of fns) {
    result = await fn(result)
  }
  return result
}

const createHandler = () => {
  return async (req: Request): Promise<Response> => {
    try {
      // Apply before interceptors
      const processedReq = before ? await callInterceptors(req, before) : req

      // Handle the request
      const response = await router(processedReq)

      // Apply after interceptors (note: after interceptors don't modify the response in this implementation)
      if (after) {
        await callInterceptors(req, after)
      }

      return response
    } catch (err) {
      !silent && debug
        ? console.error(err)
        : error(err instanceof Error ? err.message : String(err))
      return handleNotFound(req)
    }
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
        !silent && debug
          ? console.error(err)
          : error(err instanceof Error ? err.message : String(err))
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
        !silent && debug
          ? console.error(err)
          : error(err instanceof Error ? err.message : String(err))
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
const main = async (
  args?: DenoliverOptions
): Promise<{ close: () => void }> => {
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

  const handler = createHandler()

  networkAddr = getNetworkAddr()
  printStart(root, port, networkAddr, secure)

  const abortController = new AbortController()

  if (secure) {
    _serverPromise = serve(
      {
        port: port,
        cert: await Deno.readTextFile(`${root}/${certFile}`),
        key: await Deno.readTextFile(`${root}/${keyFile}`),
        signal: abortController.signal,
      },
      handler
    ).finished
  } else {
    _serverPromise = serve(
      {
        port: port,
        signal: abortController.signal,
      },
      handler
    ).finished
  }

  return {
    close: () => {
      abortController.abort()
    },
  }
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
  } catch (_err) {
    // Config file doesn't exist or is invalid - use defaults
  }

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
