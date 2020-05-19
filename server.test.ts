import { assert, assertEquals } from 'https://deno.land/std/testing/asserts.ts'
import { TextProtoReader } from 'https://deno.land/std/textproto/mod.ts'
import { BufReader } from 'https://deno.land/std/io/bufio.ts'
let server: Deno.Process
const { test } = Deno

async function setup(): Promise<void> {
  server = await Deno.run({
    cmd: [
      Deno.execPath(),
      'run',
      '--allow-read',
      '--allow-net',
      './mod.ts',
      './demo',
      '-c',
      '-p6060',
    ],
    stdout: 'piped',
    stderr: 'null',
  })

  assert(server.stdout != null)
  const r = new TextProtoReader(new BufReader(server.stdout))
  const s = await r.readLine()
  assert(s !== null && s.includes('we are live'))
}

async function tearDown(): Promise<void> {
  server.close()
  await Deno.readAll(server.stdout!)
  server.stdout!.close()
}

test('file_server serveFile', async (): Promise<void> => {
  await setup()
  try {
    const res = await fetch('http://localhost:6060/index.html')
    console.log(res)
  } finally {
    await tearDown()
  }
})
