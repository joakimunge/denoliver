<p align="center">
  <img src="media/denoliver.png" title="Denoliver" alt="It's a liver" width="530">
</p>

---

**Denoliver** is a small, simple, no config static file server with live reloading written in TypeScript for Deno intended for prototyping and Single Page Applications.

_**This project can not be run on Node.js**_

## Prerequisites

### To run this you need to have Deno 1.0 or later installed.

Read about Deno and get it here: [Deno](https://deno.land/)

## Key Features

- Dependency free! No third party dependencies. Only Deno Std Lib
- Live reload of modified files.
- Supports client side routing
- Supports HTTPS

## Getting started

### Install Denoliver as an executable

Install as a Deno executable.

> NOTE: Deno is a secure runtime by default. You need to include the `--allow-net` and `--allow-read` flags to make sure Denoliver can serve your directory.

```
$ deno install --allow-net --allow-read mod.ts
```

or if you're not happy with the name:

```
$ deno install -n whateverNameYouWant --allow-net --allow-read mod.ts
```

### Running

From your project root / directory you want to serve

```
$ denoliver

/* or */

$ denoliver ./path/to/project

// Serving on localhost:8080
```

### Serve over https

To use HTTPS you will need a trusted self-signed certificate. If you're on macOS you can use [This](https://github.com/kingkool68/generate-ssl-certs-for-local-development) bash script to easily generate one.

Name the cert and key files `denoliver.crt` and `denoliver.key` and place them in your working dir.

### Options

Denoliver comes with a couple of options to customize your experience.

```
-h       # Help
-n       # Disable live reload - Defaults to true
-s       # Disable all logging - Defaults to false
-p       # Specify desired port - Defaults to 8080
-d       # Debug for more verbose logging - Defaults to false
-t       # Use HTTPS - Requires a trusted self-signed certificate
-c       # Use CORS - Defaults to false
```

### Disclaimer

**This project is not intended for production use. It started out as a way for me personally to learn Deno, and is merely a tool to quickly get a file server up and running.**

### Acknowledgements

This project was heavily inspired by [lukejacksonn](https://github.com/lukejacksonn)s fantastic [Servor](https://github.com/lukejacksonn/servor/)
