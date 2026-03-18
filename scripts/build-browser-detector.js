#!/usr/bin/env node

/**
 * Generates public/js/detect-antipatterns-browser.js by:
 * 1. Reading the core module (shared constants + pure functions)
 * 2. Reading the browser wrapper template
 * 3. Injecting the core into the wrapper's IIFE
 *
 * Run: node scripts/build-browser-detector.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CORE_PATH = path.join(ROOT, 'source/skills/critique/scripts/detect-antipatterns-core.mjs');
const WRAPPER_PATH = path.join(ROOT, 'source/skills/critique/scripts/detect-antipatterns-browser-wrapper.js');
const OUTPUT_PATH = path.join(ROOT, '.claude/skills/critique/scripts/detect-antipatterns-browser.js');

// Read and strip exports from core
let core = fs.readFileSync(CORE_PATH, 'utf-8');
core = core
  .replace(/^export\s+/gm, '')            // Remove 'export' keywords
  .replace(/^\/\*\*[\s\S]*?\*\/\n/m, '')  // Remove file-level JSDoc
  .trim();

// Read the browser wrapper
const wrapper = fs.readFileSync(WRAPPER_PATH, 'utf-8');

// Inject core into the wrapper at the marker
const output = wrapper.replace('// {{CORE_INJECTION_POINT}}', core);

fs.writeFileSync(OUTPUT_PATH, output);
console.log(`✓ Generated ${path.relative(ROOT, OUTPUT_PATH)} (${(output.length / 1024).toFixed(1)} KB)`);
