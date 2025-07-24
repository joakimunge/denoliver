# Changelog

## [3.0.0] - 2025-07-24

### Major Changes

- **BREAKING**: Migrated to modern Deno APIs - requires Deno 2.0+
- **BREAKING**: Replaced deprecated `std/http` with built-in `Deno.serve`
- **BREAKING**: Updated all `std/*` imports to JSR `@std/*` packages
- **BREAKING**: Interceptor functions now receive `Request` instead of `ServerRequest`

### New Features

- **Dual Publishing**: Now available on both [JSR](https://jsr.io/@joakimunge/denoliver) and [deno.land/x](https://deno.land/x/denoliver)
- **Modern TypeScript**: Enhanced TypeScript support with updated type definitions
- **JSR Compatibility**: Full compatibility with the JavaScript Registry (JSR)

### Technical Improvements

- Migrated from deprecated `serveTls` to modern `Deno.serve` with TLS options
- Updated all standard library imports to use JSR (`jsr:@std/*`)
- Replaced deprecated `location.reload(true)` with `location.reload()`
- Fixed resource leaks in test suite with proper child process cleanup
- Updated CI/CD workflow for Deno 2.x compatibility
- Added project configuration with `deno.json`

### Migration Guide

**From v2.x to v3.0.0:**

1. **Deno Version**: Upgrade to Deno 2.0 or later
2. **Installation**: 
   ```bash
   # New JSR installation (recommended)
   deno install -g --allow-net --allow-read --allow-write --allow-run jsr:@joakimunge/denoliver@3.0.0 --name denoliver
   
   # Or continue using deno.land/x
   deno install -g --allow-net --allow-read --allow-write --allow-run https://deno.land/x/denoliver@3.0.0/mod.ts --name denoliver
   ```
3. **Module Imports**:
   ```typescript
   // New JSR import (recommended)
   import denoliver from 'jsr:@joakimunge/denoliver@3.0.0'
   
   // Or continue using deno.land/x
   import denoliver from 'https://deno.land/x/denoliver@3.0.0/mod.ts'
   ```
4. **Interceptors**: Update interceptor function signatures:
   ```typescript
   // Before (v2.x)
   const interceptor = (req: ServerRequest) => { /* ... */ }
   
   // After (v3.0.0)
   const interceptor = (req: Request) => { /* ... */ }
   ```

---

## [2.3.1]

### Added
- Support for `.mjs` files

### Fixed
- Installation issues on Deno 1.16.1+

## [2.3.0]

### Fixed
- Installation broken on version 1.16.1
- Updated server request type and fixed failing tests
- Updated standard library to 0.97

## [2.2.0]

### Fixed
- Set fixed version of std lib to 0.81.0 for stability

## [2.1.0]

### Fixed
- Await respond promise to fix broken pipe errors

### Added
- HTTP request interceptors (before/after)
- Injectable middleware system

## [2.0.0]

### Added
- Major rewrite with new features and improvements

---

For older versions, see the [Git history](https://github.com/joakimunge/denoliver/commits/master).
