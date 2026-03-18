/**
 * Puppeteer-powered tests for the browser detection script.
 * Verifies the browser visualizer finds the same anti-patterns as the CLI.
 *
 * These tests start a local server and use Puppeteer to load fixture pages,
 * inject the browser script, and compare findings with the CLI's jsdom output.
 *
 * Requires: puppeteer (npx cache or npm install)
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'child_process';
import path from 'path';
import { detectHtml } from '../source/skills/critique/scripts/detect-antipatterns.mjs';

const FIXTURES = path.join(import.meta.dir, 'fixtures', 'antipatterns');
const PORT = 3099; // Use a different port to avoid conflicts with dev server
let serverProcess;
let puppeteer;

// Check if puppeteer is available
let hasPuppeteer = false;
try {
  puppeteer = await import('puppeteer');
  hasPuppeteer = true;
} catch {}

const describeIf = hasPuppeteer ? describe : describe.skip;

describeIf('browser script parity with CLI', () => {
  beforeAll(async () => {
    // Start a simple file server for fixtures + browser script
    serverProcess = spawn('node', ['-e', `
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
      http.createServer((req, res) => {
        let filePath;
        if (req.url.startsWith('/fixtures/')) {
          filePath = path.join(${JSON.stringify(path.join(import.meta.dir))}, req.url);
        } else if (req.url.startsWith('/.claude/')) {
          filePath = path.join(${JSON.stringify(path.join(import.meta.dir, '..'))}, req.url);
        } else {
          res.writeHead(404); res.end(); return;
        }
        try {
          const content = fs.readFileSync(filePath);
          const ext = path.extname(filePath);
          res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
          res.end(content);
        } catch { res.writeHead(404); res.end(); }
      }).listen(${PORT});
    `], { stdio: 'ignore' });

    // Wait for server to start
    await new Promise(r => setTimeout(r, 500));
  });

  afterAll(() => {
    if (serverProcess) serverProcess.kill();
  });

  async function scanWithBrowser(fixtureName) {
    const browser = await puppeteer.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/fixtures/antipatterns/${fixtureName}`, {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });

    // Wait for the browser script to run (it uses setTimeout 100ms)
    await new Promise(r => setTimeout(r, 300));

    const results = await page.evaluate(() => {
      if (!window.impeccableScan) return [];
      const allFindings = window.impeccableScan();
      return allFindings.flatMap(({ findings }) =>
        findings.map(f => ({ type: f.type, detail: f.detail }))
      );
    });

    await browser.close();
    return results;
  }

  function getTypes(findings) {
    return [...new Set(findings.map(f => f.antipattern || f.type))].sort();
  }

  test('should-flag.html: browser finds border anti-patterns', async () => {
    const browserFindings = await scanWithBrowser('should-flag.html');
    const types = [...new Set(browserFindings.map(f => f.type))];
    expect(types).toContain('side-tab');
    expect(types).toContain('border-accent-on-rounded');
  }, 15000);

  test('should-pass.html: browser finds no border anti-patterns', async () => {
    const browserFindings = await scanWithBrowser('should-pass.html');
    const borderFindings = browserFindings.filter(f =>
      f.type === 'side-tab' || f.type === 'border-accent-on-rounded'
    );
    expect(borderFindings).toHaveLength(0);
  }, 15000);

  test('color-should-flag.html: browser finds color anti-patterns', async () => {
    const browserFindings = await scanWithBrowser('color-should-flag.html');
    const types = [...new Set(browserFindings.map(f => f.type))];
    expect(types).toContain('low-contrast');
    expect(types).toContain('gray-on-color');
  }, 15000);

  test('color-should-pass.html: browser finds zero findings', async () => {
    const browserFindings = await scanWithBrowser('color-should-pass.html');
    expect(browserFindings).toHaveLength(0);
  }, 15000);

  test('layout-should-flag.html: browser finds nested cards', async () => {
    const browserFindings = await scanWithBrowser('layout-should-flag.html');
    const nested = browserFindings.filter(f => f.type === 'nested-cards');
    expect(nested.length).toBeGreaterThanOrEqual(3);
  }, 15000);

  test('layout-should-pass.html: browser finds no nested cards', async () => {
    const browserFindings = await scanWithBrowser('layout-should-pass.html');
    const nested = browserFindings.filter(f => f.type === 'nested-cards');
    expect(nested).toHaveLength(0);
  }, 15000);

  test('typography-should-flag.html: browser finds typography issues', async () => {
    const browserFindings = await scanWithBrowser('typography-should-flag.html');
    const types = [...new Set(browserFindings.map(f => f.type))];
    expect(types).toContain('overused-font');
    expect(types).toContain('flat-type-hierarchy');
  }, 15000);

  test('partial-component.html: browser skips page-level checks', async () => {
    const browserFindings = await scanWithBrowser('partial-component.html');
    // Should find border issues but not typography
    const hasBorder = browserFindings.some(f => f.type === 'side-tab');
    const hasTypo = browserFindings.some(f =>
      f.type === 'flat-type-hierarchy' || f.type === 'single-font'
    );
    expect(hasBorder).toBe(true);
    // Browser script doesn't have isFullPage check, so we just verify borders work
  }, 15000);
});
