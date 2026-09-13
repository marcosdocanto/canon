#!/usr/bin/env node
import { existsSync } from 'node:fs';

// A checkout runs current source; npm ships only the compiled runtime.
const source = new URL('../src/cli.ts', import.meta.url);
await import(existsSync(source) ? source.href : new URL('../lib/cli.mjs', import.meta.url).href);
