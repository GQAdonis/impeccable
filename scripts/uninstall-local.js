#!/usr/bin/env node

/**
 * Local Development Uninstallation Script
 *
 * Removes symlinks created by install-local.js
 *
 * Usage:
 *   bun run scripts/uninstall-local.js [--providers=claude,cursor,...]
 */

import path from 'path';
import fs from 'fs';

const HOME_DIR = process.env.HOME || process.env.USERPROFILE;

// Provider configurations
const PROVIDERS = {
  claude: { dir: '.claude', label: 'Claude Code' },
  cursor: { dir: '.cursor', label: 'Cursor' },
  gemini: { dir: '.gemini', label: 'Gemini CLI' },
  codex: { dir: '.codex', label: 'Codex CLI' },
  agents: { dir: '.agents', label: 'VS Code Copilot / Antigravity' },
  kiro: { dir: '.kiro', label: 'Kiro' },
  opencode: { dir: '.opencode', label: 'OpenCode' },
  pi: { dir: '.pi', label: 'Pi' },
  trae: { dir: '.trae', label: 'Trae International' },
  'trae-cn': { dir: '.trae-cn', label: 'Trae China' },
};

// Impeccable skills to remove
const IMPECCABLE_SKILLS = [
  'adapt', 'animate', 'arrange', 'audit', 'bolder', 'clarify', 'colorize',
  'critique', 'delight', 'distill', 'extract', 'frontend-design', 'harden',
  'normalize', 'onboard', 'optimize', 'overdrive', 'polish', 'quieter',
  'teach-impeccable', 'typeset'
];

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let providers = Object.keys(PROVIDERS);

  for (const arg of args) {
    if (arg.startsWith('--providers=')) {
      providers = arg.split('=')[1].split(',').map(p => p.trim());
    }
  }

  return { providers };
}

/**
 * Remove symlink if it exists and points to impeccable
 */
function removeSymlink(linkPath) {
  if (!fs.existsSync(linkPath)) {
    return false;
  }

  const stats = fs.lstatSync(linkPath);
  if (!stats.isSymbolicLink()) {
    console.warn(`⚠️  ${linkPath} is not a symlink, skipping`);
    return false;
  }

  const target = fs.readlinkSync(linkPath);
  if (!target.includes('impeccable')) {
    console.warn(`⚠️  ${linkPath} points to ${target}, not impeccable, skipping`);
    return false;
  }

  try {
    fs.unlinkSync(linkPath);
    return true;
  } catch (error) {
    console.error(`❌ Failed to remove ${linkPath}: ${error.message}`);
    return false;
  }
}

/**
 * Uninstall symlinks for a provider
 */
function uninstallProvider(providerName) {
  const config = PROVIDERS[providerName];
  if (!config) {
    console.error(`❌ Unknown provider: ${providerName}`);
    return;
  }

  console.log(`🗑️  Uninstalling ${config.label} (${config.dir})...`);

  const globalSkillsDir = path.join(HOME_DIR, config.dir, 'skills');

  if (!fs.existsSync(globalSkillsDir)) {
    console.log(`   No skills directory found, skipping\n`);
    return;
  }

  let removedCount = 0;
  for (const skill of IMPECCABLE_SKILLS) {
    const linkPath = path.join(globalSkillsDir, skill);
    if (removeSymlink(linkPath)) {
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`   ✓ Removed ${removedCount} symlinks\n`);
  } else {
    console.log(`   No impeccable symlinks found\n`);
  }
}

/**
 * Main uninstallation process
 */
function uninstall() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║ Impeccable Local Uninstallation       ║');
  console.log('╚════════════════════════════════════════╝\n');

  const { providers } = parseArgs();

  console.log(`Target providers: ${providers.join(', ')}\n`);

  // Uninstall symlinks for each provider
  for (const provider of providers) {
    uninstallProvider(provider);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Uninstallation complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Run uninstallation
uninstall();
