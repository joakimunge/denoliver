import { assert, assertEquals } from 'https://deno.land/std/testing/asserts.ts'
import { TextProtoReader } from 'https://deno.land/std/textproto/mod.ts'
import { BufReader } from 'https://deno.land/std/io/bufio.ts'
import { Args } from 'https://deno.land/std/flags/mod.ts'
import { appendReloadScript } from './utils.ts'

let server: Deno.Process
let port: number = 6060
const { test } = Deno

async function setup(args?: Args): Promise<void> {
  const cmd = [
    Deno.execPath(),
    'run',
    '--allow-read',
    '--allow-net',
    './mod.ts',
    './demo',
  ]

  args && args.c && cmd.push('-c')
  args && args.n && cmd.push('-n')
  if (args && args.p) {
    port = args.p
  } else {
    port = 6060
  }
  cmd.push(`-p${port}`)

  server = await Deno.run({
    cmd,
    stdout: 'piped',
    stderr: 'null',
  })
  assert(server.stdout != null)
  const r = new TextProtoReader(new BufReader(server.stdout))
  const s = await r.readLine()
  assert(s !== null && s.includes('Denoliver v1.0.0'))
}

async function tearDown(): Promise<void> {
  server.close()
  await Deno.readAll(server.stdout!)
  server.stdout!.close()
}

test('should serve on given port', async (): Promise<void> => {
  await setup({ _: ['./demo'], p: 7000 })
  try {
    const res = await fetch(`http://localhost:${port}`)
    const file = await res.text()
    assertEquals(port, 7000)
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
  } finally {
    await tearDown()
  }
})

test('handleRouteRequest should return index.html', async (): Promise<void> => {
  await setup()
  try {
    const res = await fetch(`http://localhost:${port}`)
    const file = await res.text()
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
    assert(file.includes(`<div id="denoliver">`))
  } finally {
    await tearDown()
  }
})

test('index.html should contain reload script', async (): Promise<void> => {
  await setup()
  try {
    const res = await fetch(`http://localhost:${port}`)
    const file = await res.text()
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
    assert(file.includes(appendReloadScript('', 6060, false)))
  } finally {
    await tearDown()
  }
})

test('given no reload option index.html should not contain reload script', async (): Promise<
  void
> => {
  await setup({ _: ['./demo'], n: true })
  try {
    const res = await fetch(`http://localhost:${port}`)
    const file = await res.text()
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
    assert(!file.includes(appendReloadScript('', 6060, false)))
  } finally {
    await tearDown()
  }
})

test('/any/other/route should return index.html', async (): Promise<void> => {
  await setup()
  try {
    const res = await fetch(`http://localhost:${port}/any/other/route`)
    const file = await res.text()
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
    assert(file.includes(`<div id="denoliver">`))
  } finally {
    await tearDown()
  }
})

test('/style.css should return style.css from ./demo', async (): Promise<
  void
> => {
  await setup()
  try {
    const res = await fetch(`http://localhost:${port}/style.css`)
    const file = await res.text()
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
    const localFile = new TextDecoder().decode(
      await Deno.readFile('./demo/style.css'),
    )
    assert(file, localFile)
  } finally {
    await tearDown()
  }
})

test('given a path to file not found should return 404', async (): Promise<
  void
> => {
  await setup()
  try {
    const res = await fetch(`http://localhost:${port}/does-not-exist.js`)
    const file = await res.text()
    assertEquals(res.status, 404)
    assertEquals(res.statusText, 'Not Found')
    assert(file.includes('<title>404</title>'))
  } finally {
    await tearDown()
  }
})

test('when cors enabled response should have access control header', async (): Promise<
  void
> => {
  await setup({ _: ['./demo'], c: true })
  try {
    const res = await fetch(`http://localhost:${port}`)
    const file = await res.text()
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
    assert(res.headers.has('access-control-allow-origin'))
    assert(file.includes(`<div id="denoliver">`))
  } finally {
    await tearDown()
  }
})
