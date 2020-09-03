import { ServerRequest } from 'https://deno.land/std@0.67.0/http/server.ts'

export default (req: ServerRequest) => {
  console.log('After Request Interceptor')
  return req
}
