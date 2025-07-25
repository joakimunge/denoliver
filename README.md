<p align="center">
  <img src="media/denoliver_2.png" title="Denoliver" alt="It's a liver" width="320" style="margin: 48px 48px">
</p>

<p align="center" style="margin-top: 48px">
<a href="https://github.com/joakimunge/denoliver/actions">
<img src="https://img.shields.io/github/workflow/status/joakimunge/denoliver/ci?style=for-the-badge"></a>
<a href="https://github.com/joakimunge/denoliver/releases">
<img src="https://img.shields.io/github/v/release/joakimunge/denoliver?style=for-the-badge"></a>
</p>

---

**Denoliver** is a small, zero config dev & static file server with live reloading written in TypeScript for Deno intended for prototyping and Single Page Applications.

> **Version 3.0+**: Now available on both [JSR](https://jsr.io/@joakimunge/denoliver) and [deno.land/x](https://deno.land/x/denoliver) with modern Deno APIs and improved TypeScript support!

## Prerequisites

* [Deno 2.0+](https://deno.land/manual/getting_started/installation)

## Key Features

- Dependency free! No third party dependencies.
- Live reload
- Supports client side routing for Single Page Applications.
- Directory lists
- Supports HTTPS
- Allows for programmatic use as a module
- Boilerplating for rapid prototyping.
- Injectable HTTP request interceptors. (TS & JS)

## Getting Started

### Installation

```bash
# Install from JSR (recommended)
deno install -g --allow-net --allow-read --allow-write --allow-run jsr:@joakimunge/denoliver@3.0.0 --name denoliver

# Or install from deno.land/x
deno install -g --allow-net --allow-read --allow-write --allow-run https://deno.land/x/denoliver@3.0.0/mod.ts --name denoliver
```

### Usage

Running denoliver without any arguments will start a server on port `3000` and serve files from the current working directory.

> **Note**: Deno is a secure runtime by default. You need to include the `--allow-net`, `--allow-read`, `--allow-write`, and `--allow-run` flags to make sure Denoliver can serve your directory and display network addresses.

or if you're not happy with the name:

```bash
$ deno install --global -n whateverNameYouWant --allow-net --allow-read --allow-write --allow-run jsr:@joakimunge/denoliver@3.0.0
```

## Why do I need the `--allow-sys` flag?

_You don't need it! You can still use Denoliver as normal without this flag._

Denoliver uses `Deno.networkInterfaces()` to display your local network address. This API requires the `--allow-sys` permission. If you don't provide this flag, Denoliver will still work but won't be able to show the network address in the startup message.

## Running

Serve your directory

```s
$ denoliver ./demo
```

## Options

Denoliver comes with a couple of options to customize your experience.

```s
-h                 # Help
-n                 # Disable live reload - Defaults to false
-s                 # Disable all output - Defaults to false
-p <PORT>          # Specify desired port - Defaults to 8080
-d                 # Debug for more verbose output - Defaults to false
-t                 # Use HTTPS - Requires a trusted self-signed certificate
-l                 # Use directory listings - Disables routing (SPA)
-c                 # Use CORS - Defaults to false
--before=<..>   # Before request Interceptor(s)
--after=<..>    # After request Interceptor(s)
--certFile=<..>    # Specify certificate file - Defaults to denoliver.crt
--keyFile=<..>     # Specify key file - Defaults to denoliver.key
--entry=<..>       # Specify optional entrypoint - Defaults to index.html
```

### Directory Listing

Denoliver supports indexing of served directories and provides a simple interface, with dark mode support, for navigating a project folder.

<p align="center">
  <img src="media/list.png" alt="Directory listing">
</p>

### Optional boilerplating

If the given directory doesn't exist, denoliver will ask you if you want to create a boilerplate. This will generate an a basic project folder and serve it for you. Very useful to get up and running quickly.

```
├── index.html
├── index.css
├── app.js
```

### Interceptors

Denoliver allows you to inject your own request interceptors to be fired before or after the HTTP requests has been handled by the server.
This can be one or more functions which have access to the request object (instance of [Deno.Request](https://doc.deno.land/builtin/stable#Request)) and gets called in the order they are defined with the output of the previous function (piped). **These functions must all return the request object.**

Interceptors can be a single function, for example:

```typescript
// before.ts

export default (req: Request) => {
  req.headers.set('Authorization', 'Bearer some-token')
  return req
}
```

or an array of functions:

```typescript
const setHeaders = (req: Request) => {
  req.headers.set('Authorization', 'Bearer some-token')
  return req
}

const logRequestUrl = (req: Request) => {
  console.log(req.url)
  return req
}

export default [setHeaders, logRequestUrl]
```

of course this can also be used when using Denoliver as a module:

```typescript
const server = denoliver({
  port: 6060,
  before: (req: Request) => {
    req.headers.set('Authorization', 'Bearer some-token')
    return req
  },
})
```

## Configuration

If you want, you can place a configuration file called `denoliver.json` in the folder you are serving to avoid having to use command line arguments to customize its behaviour. By default it will look like this:

```JSON
{
  "root": ".",
  "port": 8080,
  "disableReload": false,
  "silent": false,
  "debug": false,
  "secure": false,
  "cors": false,
  "list": false,
  "before": "before.ts",
  "after": "after.ts",
  "certFile": "some_file.crt",
  "keyFile": "some_file.key",
  "entryPoint": "index.html"
}
```

## API

Denoliver can also be used as a module in any Deno project.
This exposes an instance of [Deno.Server](https://docs.deno.com/api/deno/~/Deno.serve).

The main function accepts the same config object as specified in the config file above.

```typescript
// Import from JSR (recommended)
import denoliver from 'jsr:@joakimunge/denoliver@3.0.0'

// Or import from deno.land/x
import denoliver from 'https://deno.land/x/denoliver@3.0.0/mod.ts'

const server = denoliver({ port: 6060, cors: true })

server.close() // Close the server
```

## Serve over HTTPS

To use HTTPS you will need a trusted self-signed certificate. If you're on macOS you can use [This](https://github.com/kingkool68/generate-ssl-certs-for-local-development) bash script to easily generate one.

Name the cert and key files `denoliver.crt` and `denoliver.key` and place them in your working dir. You can configure these names to be whatever you want with the config file, or the `--certFile` and `--keyFile` flags.

## Disclaimer

**This project is not intended for production use. It started out as a way for me personally to learn Deno, and is merely a tool to quickly get a file server up and running.**

## Acknowledgements

This project was heavily inspired by [lukejacksonn](https://github.com/lukejacksonn)s fantastic [Servor](https://github.com/lukejacksonn/servor/)
