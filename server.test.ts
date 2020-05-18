import { assert } from 'https://deno.land/std/testing/asserts.ts'
import { TextProtoReader } from 'https://deno.land/std/textproto/mod.ts'
import { BufReader } from 'https://deno.land/std/io/bufio.ts'
let server

async function startFileServer(): Promise<void> {
  server = await Deno.run({
    cmd: [
      Deno.execPath(),
      'run',
      '--allow-read',
      '--allow-net',
      'mod.ts',
      './demo',
      '-p6060',
    ],
  })

  // Once fileServer is ready it will write to its stdout.
  console.log(server)
  // assert(server.stdout != null)
  // const r = new TextProtoReader(new BufReader(server.stdout))
  // const s = await r.readLine()
  // assert(s !== null && s.includes('Denoliver'))
}

Deno.test('SERVER', async () => {
  await startFileServer()

  const res = await fetch('http://localhost:6060')
  console.log(res)
})
