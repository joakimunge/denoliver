# De(no)liver

Denoliver is a small, simple, no config static file server with live reloading written in TypeScript for Deno intended for prototyping and quick projects.

_**This project can not be run on Node.js**_

## Prerequisites

### To run this you need to have Deno 1.0 or later installed.

Read about Deno and get it here: [Deno](https://deno.land/)

## Getting started

### Install Denoliver as an executable

Install as an executabled

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

// Serving on localhost:8080
```

### Acknowledgements

This project was heavily inspired by [lukejacksonn](https://github.com/lukejacksonn)s fantastic [Servor](https://github.com/lukejacksonn/servor/)
