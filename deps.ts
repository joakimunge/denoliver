export { assert } from '@std/assert/assert'
export { assertEquals } from '@std/assert/equals'
export { parseArgs as parse } from '@std/cli/parse-args'
export { blue, bold, green, red } from '@std/fmt/colors'
export { extname } from '@std/path/extname'
export * as posix from '@std/path/posix'

export const serve = Deno.serve

export type { Args } from '@std/cli/parse-args'
