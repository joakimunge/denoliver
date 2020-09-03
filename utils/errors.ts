export class InterceptorException extends Error {
  constructor() {
    super()
    this.message =
      'Argument is not type of ServerRequest. Did you forget to return the request object in your interceptor?'
  }
}
