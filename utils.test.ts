import { assertEquals, assert } from './deps.ts'
import {
  isRoute,
  contentType,
  isValidPort,
  isValidArg,
  readFile,
  pipe,
} from './utils/utils.ts'

/* Utils */

Deno.test('isRoute', () => {
  const isRouteRequest = isRoute('/route/goes/here')
  assertEquals(isRouteRequest, true)
})

Deno.test('isRoute', () => {
  const isRouteRequest = isRoute('http://www.someurl.com/test')
  assertEquals(isRouteRequest, true)
})

Deno.test('isRoute', () => {
  const isRouteRequest = isRoute('http://www.someurl.com/main.js')
  assertEquals(isRouteRequest, false)
})

Deno.test('contentType', () => {
  const type = contentType('/path/to/image.jpg')
  assertEquals(type, 'image/jpg')
})

Deno.test('contentType', () => {
  const type = contentType('/path/to/dataset.json')
  assertEquals(type, 'application/json')
})

Deno.test('contentType', () => {
  const type = contentType('/path/to/app.exe')
  assertEquals(type, 'application/octet-stream')
})

Deno.test('isValidPort', () => {
  const valid = isValidPort('Not a port')
  assertEquals(valid, false)
})

Deno.test('isValidPort', () => {
  const valid = isValidPort(123456789)
  assertEquals(valid, false)
})

Deno.test('isValidPort', () => {
  const valid = isValidPort(8081)
  assertEquals(valid, true)
})

Deno.test('isValidPort', () => {
  const valid = isValidPort(false)
  assertEquals(valid, false)
})

Deno.test('isValidArg', () => {
  const valid = isValidArg('n')
  assertEquals(valid, true)
})

Deno.test('isValidArg', () => {
  const valid = isValidArg('b')
  assertEquals(valid, false)
})

Deno.test('readFile', async () => {
  const file = await readFile('./demo/index.html')
  assert(file.includes('<!DOCTYPE html'))
})

Deno.test(
  'pipe calls all functions in array with outcome of previous fn',
  async () => {
    const fn1 = (val: number) => val + 1
    const fn2 = (val: number) => val + 2
    const fn3 = (val: number) => val + 3
    const funcs = [fn1, fn2, fn3]

    const pipedFunction = pipe(...funcs)
    assertEquals(await pipedFunction(1), 7)
  }
)

Deno.test('pipe works with single function argument', async () => {
  const fn1 = (val: number) => val + 1

  const pipedFunction = pipe(fn1)
  assertEquals(await pipedFunction(1), 2)
})
