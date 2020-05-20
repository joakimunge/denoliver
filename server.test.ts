import { assert, assertEquals } from 'https://deno.land/std/testing/asserts.ts'
import { TextProtoReader } from 'https://deno.land/std/textproto/mod.ts'
import { BufReader } from 'https://deno.land/std/io/bufio.ts'
import { Args } from 'https://deno.land/std/flags/mod.ts'

let server: Deno.Process
const { test } = Deno

async function setup(args?: Args): Promise<void> {
  const cmd = [
    Deno.execPath(),
    'run',
    '--allow-read',
    '--allow-net',
    './mod.ts',
    './demo',
    '-p6060',
  ]

  args && args.c && cmd.push('-c')

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

test('handleRouteRequest /', async (): Promise<void> => {
  await setup()
  try {
    const res = await fetch('http://localhost:6060')
    const file = await res.text()
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
    assert(file.includes(`<div id="denoliver">`))
  } finally {
    await tearDown()
  }
})

test('handleRouteRequest to  /any/other/route', async (): Promise<void> => {
  await setup()
  try {
    const res = await fetch('http://localhost:6060/any/other/route')
    const file = await res.text()
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
    assert(file.includes(`<div id="denoliver">`))
  } finally {
    await tearDown()
  }
})

test('handleFileRequest', async (): Promise<void> => {
  await setup()
  try {
    const res = await fetch('http://localhost:6060/style.css')
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

test('handleNotFound', async (): Promise<void> => {
  await setup()
  try {
    const res = await fetch('http://localhost:6060/does-not-exist.js')
    const file = await res.text()
    assertEquals(res.status, 404)
    assertEquals(res.statusText, 'Not Found')
    assert(file.includes('<title>404</title>'))
  } finally {
    await tearDown()
  }
})

test('cors', async (): Promise<void> => {
  await setup({ _: ['./demo'], c: true })
  try {
    const res = await fetch('http://localhost:6060')
    const file = await res.text()
    assertEquals(res.status, 200)
    assert(res.headers.has('content-type'))
    assert(res.headers.has('access-control-allow-origin'))
    assert(file.includes(`<div id="denoliver">`))
  } finally {
    await tearDown()
  }
})
