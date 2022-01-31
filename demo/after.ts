export default (req: Request) => {
  console.log('After Request Interceptor')
  return req
}
