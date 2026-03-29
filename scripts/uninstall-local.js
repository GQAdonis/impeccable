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

import { readManifest, writeManifest, removeProvider } from './lib/manifest.js';

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
 * Uninstall symlinks for a provider
 */
function uninstallProvider(providerName, manifest) {
  const config = PROVIDERS[providerName];
  if (!config) {
    console.error(`❌ Unknown provider: ${providerName}`);
    return false;
  }

  console.log(`📦 Uninstalling ${config.label} (${config.dir})...`);

  const centralProviderDir = path.join(HOME_DIR, '.TOOLS/skills', providerName);
  const legacySkillsDir = path.join(HOME_DIR, config.dir, 'skills');

  // Check manifest for installed skills
  const providerData = manifest?.providers?.[providerName];
  if (!providerData) {
    console.warn(`⚠️  No manifest entry for ${providerName}`);
    return false;
  }

  const impeccableSkills = providerData.skills || [];
  let removedCount = 0;

  // Remove individual skill symlinks (tracked in manifest as impeccable)
  for (const skill of impeccableSkills) {
    const linkPath = path.join(centralProviderDir, skill);

    if (fs.existsSync(linkPath)) {
      const stats = fs.lstatSync(linkPath);

      if (stats.isSymbolicLink()) {
        try {
          fs.unlinkSync(linkPath);
          console.log(`   ✓ Removed ${skill}`);
          removedCount++;
        } catch (error) {
          console.error(`   ❌ Failed to remove ${skill}: ${error.message}`);
        }
      } else {
        console.warn(`   ⚠️  ${skill} is not a symlink, skipping`);
      }
    }
  }

  console.log(`   Removed ${removedCount}/${impeccableSkills.length} skills`);

  // Check for untracked symlinks
  const actualSkills = fs.readdirSync(centralProviderDir);
  const untrackedSymlinks = actualSkills.filter(s => !impeccableSkills.includes(s));
  if (untrackedSymlinks.length > 0) {
    console.warn(`   ⚠️  Found ${untrackedSymlinks.length} untracked symlinks (not removed):`);
    untrackedSymlinks.forEach(s => console.warn(`      - ${s}`));
  }

  // Remove provider-level symlink
  if (fs.existsSync(legacySkillsDir)) {
    const stats = fs.lstatSync(legacySkillsDir);

    if (stats.isSymbolicLink()) {
      const target = fs.readlinkSync(legacySkillsDir);

      const resolvedTarget = path.resolve(target);
      const expectedTarget = path.resolve(path.join(HOME_DIR, '.TOOLS/skills', providerName));
      if (resolvedTarget === expectedTarget) {
        try {
          fs.unlinkSync(legacySkillsDir);
          console.log(`   ✓ Removed ${legacySkillsDir}`);
        } catch (error) {
          console.error(`   ❌ Failed to remove provider symlink: ${error.message}`);
        }
      }
    }
  }

  // Offer to restore backup
  if (providerData.legacyBackup && fs.existsSync(providerData.legacyBackup)) {
    console.log(`\n   📦 Backup found: ${providerData.legacyBackup}`);
    console.log(`   To restore: mv "${providerData.legacyBackup}" "${legacySkillsDir}"`);
  }

  // Remove from manifest
  removeProvider(manifest, providerName);

  // Write manifest immediately after removing provider
  try {
    writeManifest(manifest);
    console.log(`   ✓ Manifest updated for ${providerName}`);
  } catch (error) {
    console.error(`   ❌ Failed to update manifest: ${error.message}`);
  }

  console.log();
  return true;
}

/**
 * Cleanup empty directories
 */
function cleanupEmptyDirs() {
  console.log('🧹 Cleaning up empty directories...\n');

  // Check each provider directory
  for (const providerName of Object.keys(PROVIDERS)) {
    const providerDir = path.join(HOME_DIR, '.TOOLS/skills', providerName);

    if (fs.existsSync(providerDir)) {
      const contents = fs.readdirSync(providerDir);

      if (contents.length === 0) {
        try {
          fs.rmdirSync(providerDir);
          console.log(`   ✓ Removed empty ${providerDir}`);
        } catch (error) {
          console.error(`   ❌ Failed to remove ${providerDir}: ${error.message}`);
        }
      }
    }
  }

  // Check skills directory
  const skillsDir = path.join(HOME_DIR, '.TOOLS/skills');
  if (fs.existsSync(skillsDir)) {
    const contents = fs.readdirSync(skillsDir).filter(f => f !== '.impeccable-manifest.json');

    if (contents.length === 0) {
      // Remove manifest
      const manifestPath = path.join(skillsDir, '.impeccable-manifest.json');
      if (fs.existsSync(manifestPath)) {
        fs.unlinkSync(manifestPath);
      }

      // Remove directory
      try {
        fs.rmdirSync(skillsDir);
        console.log(`   ✓ Removed empty ${skillsDir}`);
      } catch (error) {
        console.error(`   ❌ Failed to remove ${skillsDir}: ${error.message}`);
      }
    }
  }

  // Check .TOOLS directory
  const toolsDir = path.join(HOME_DIR, '.TOOLS');
  if (fs.existsSync(toolsDir)) {
    const contents = fs.readdirSync(toolsDir);

    if (contents.length === 0) {
      try {
        fs.rmdirSync(toolsDir);
        console.log(`   ✓ Removed empty ${toolsDir}`);
      } catch (error) {
        console.error(`   ❌ Failed to remove ${toolsDir}: ${error.message}`);
      }
    }
  }
}

/**
 * Main uninstallation process
 */
function uninstall() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Impeccable Local Uninstall Process   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const { providers } = parseArgs();

  console.log(`Target providers: ${providers.join(', ')}\n`);

  // Read manifest
  const manifest = readManifest();

  if (!manifest) {
    console.error('❌ No manifest found - installation may not have completed');
    console.error('   Try removing symlinks manually:');
    console.error('   ls -la ~/.claude/skills/');
    console.error('   ls -la ~/.TOOLS/skills/');
    process.exit(1);
  }

  console.log('📝 Reading installation manifest\n');

  // Uninstall each provider
  for (const provider of providers) {
    uninstallProvider(provider, manifest);
  }

  // Check remaining providers
  const remainingProviders = Object.keys(manifest.providers || {});
  if (remainingProviders.length === 0) {
    console.log('✓ All providers uninstalled\n');
  }

  // Cleanup empty directories
  cleanupEmptyDirs();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Uninstallation complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run uninstallation
uninstall();