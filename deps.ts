export { assert } from 'https://deno.land/std@0.224.0/assert/assert.ts'
export { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts'
export { parseArgs as parse } from 'https://deno.land/std@0.224.0/cli/parse_args.ts'
export {
  blue,
  bold,
  green,
  red,
} from 'https://deno.land/std@0.224.0/fmt/colors.ts'
export { extname } from 'https://deno.land/std@0.224.0/path/extname.ts'
export * as posix from 'https://deno.land/std@0.224.0/path/posix/mod.ts'

export const serve = Deno.serve

export type { Args } from 'https://deno.land/std@0.224.0/cli/parse_args.ts'
