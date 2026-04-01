# @smackdabdevops/logger

Prism-style **ANSI dev logging** for Smackdab NestJS apps. This package is a **pino transport** that pretty-prints JSON log records (domains, levels, HTTP lines, structured data) in the terminal. It layers on top of **nestjs-pino**; it does not replace pino.

## Install

Published to **GitHub Packages** (`publishConfig` in `package.json`). Configure `.npmrc` for the `@smackdabdevops` scope, then:

```bash
npm install @smackdabdevops/logger
```

Peer dependency: **pino** (already provided by your app).

## Use as a pino transport (recommended)

Point nestjs-pino at the transport subpath (dev-only, e.g. when `PRISM_LOGGING=true`):

```typescript
const devTransport =
  process.env.PRISM_LOGGING === 'true'
    ? { target: '@smackdabdevops/logger/transport', options: {} }
    : {
        target: 'pino-pretty',
        options: {
          /* your existing dev options */
        },
      };
```

Add the custom level if you use **`ok`** at **35**:

```typescript
customLevels: { ok: 35 },
```

## Direct API (scripts / CLI)

```typescript
import { log, emit, COLORS } from '@smackdabdevops/logger';

log.info('MY_DOMAIN', 'Server started', { port: 3000 });
```

## Build

```bash
npm install
npm run build
```

Outputs CommonJS under `dist/` (`dist/index.js`, `dist/transport.js`). The transport file uses `module.exports` so pino’s worker thread can `require()` it.

## License

UNLICENSED (private Smackdab package).
