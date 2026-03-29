#!/usr/bin/env node

/**
 * Local Development Installation Script
 *
 * Builds impeccable and creates global symbolic links so that:
 * 1. All AI tools consume skills from this local repo
 * 2. Upstream updates are immediately available everywhere
 * 3. Local changes can be tested in real-time
 *
 * Usage:
 *   bun run scripts/install-local.js [--providers=claude,cursor,...]
 *
 * Without --providers flag, installs all providers.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

import {
  readManifest,
  writeManifest,
  initManifest,
  addProviderToManifest
} from './lib/manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
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
 * Run build process
 */
function buildProject() {
  console.log('🔨 Building impeccable...\n');
  try {
    execSync('bun run build', {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });
    console.log('\n✓ Build complete\n');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// createSymlink function removed in favor of createSkillSymlink

/**
 * Get all skill directories from a provider config directory
 */
function getSkillDirs(providerDir) {
  const skillsPath = path.join(providerDir, 'skills');
  if (!fs.existsSync(skillsPath)) {
    return [];
  }

  return fs.readdirSync(skillsPath)
    .filter(name => {
      const fullPath = path.join(skillsPath, name);
      return fs.statSync(fullPath).isDirectory();
    });
}

/**
 * Create centralized directory structure
 */
function createCentralizedDirs() {
  const centralRoot = path.join(HOME_DIR, '.TOOLS/skills');

  if (!fs.existsSync(centralRoot)) {
    try {
      fs.mkdirSync(centralRoot, { recursive: true });
      console.log(`✓ Created ${centralRoot}\n`);
    } catch (error) {
      console.error(`❌ Failed to create ${centralRoot}: ${error.message}`);
      console.error('   Check permissions: ls -la ~/.TOOLS/');
      process.exit(1);
    }
  }
}

/**
 * Create symlink with validation
 * @param {string} target - Symlink target path
 * @param {string} linkPath - Symlink location
 * @param {string} skillName - Skill name for logging
 * @returns {boolean} True if created or already valid
 */
function createSkillSymlink(target, linkPath, skillName) {
  // Validate target path exists
  if (!fs.existsSync(target)) {
    console.error(`   ❌ Source path does not exist: ${target}`);
    return false;
  }

  // Check if link already exists
  if (fs.existsSync(linkPath)) {
    const stats = fs.lstatSync(linkPath);

    if (stats.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(linkPath);
      // Resolve both paths to absolute before comparing
      const resolvedCurrentTarget = path.resolve(currentTarget);
      const resolvedTarget = path.resolve(target);

      if (resolvedCurrentTarget === resolvedTarget) {
        console.log(`   ⏭  ${skillName} already linked`);
        return true;
      } else {
        console.warn(`   ⚠️  ${skillName} points to wrong location:`);
        console.warn(`      Current: ${currentTarget}`);
        console.warn(`      Expected: ${target}`);
        fs.unlinkSync(linkPath);
      }
    } else if (stats.isDirectory()) {
      console.error(`   ❌ ${linkPath} is a directory (not a symlink)`);
      console.error(`      Move it first: mv "${linkPath}" "${linkPath}.backup"`);
      return false;
    } else {
      console.error(`   ❌ ${linkPath} exists but is not a symlink or directory`);
      return false;
    }
  }

  // Create symlink
  try {
    fs.symlinkSync(target, linkPath, 'dir'); // Specify type for Windows compatibility
    console.log(`   ✓ Linked ${skillName}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to create symlink: ${error.message}`);
    return false;
  }
}

/**
 * Migrate legacy provider directory to centralized location
 * @param {string} providerName - Provider name (e.g., 'claude')
 * @param {Object} config - Provider configuration
 * @param {string} centralProviderDir - Centralized provider directory path
 * @param {Array<string>} impeccableSkills - List of impeccable skill names
 * @returns {string|null} Backup directory path if created, null otherwise
 */
function migrateLegacyDirectory(providerName, config, centralProviderDir, impeccableSkills) {
  const legacySkillsDir = path.join(HOME_DIR, config.dir, 'skills');

  // Check if legacy directory exists
  if (!fs.existsSync(legacySkillsDir)) {
    // Doesn't exist - create symlink directly
    try {
      // Create parent directory if it doesn't exist
      fs.mkdirSync(path.dirname(legacySkillsDir), { recursive: true });
      fs.symlinkSync(centralProviderDir, legacySkillsDir);
      console.log(`   ✓ Created ${legacySkillsDir} → ${centralProviderDir}`);
      return null;
    } catch (error) {
      console.error(`   ❌ Failed to create provider symlink: ${error.message}`);
      return null;
    }
  }

  const stats = fs.lstatSync(legacySkillsDir);

  if (stats.isSymbolicLink()) {
    // Already a symlink - verify target
    const currentTarget = fs.readlinkSync(legacySkillsDir);
    const resolvedCurrentTarget = path.resolve(currentTarget);
    const resolvedCentralProviderDir = path.resolve(centralProviderDir);

    if (resolvedCurrentTarget === resolvedCentralProviderDir) {
      console.log(`   ✓ ${legacySkillsDir} already points to centralized location`);
      return null;
    } else {
      console.log(`   ⚠️  ${legacySkillsDir} points to wrong location`);
      console.log(`      Current: ${currentTarget}`);
      console.log(`      Expected: ${centralProviderDir}`);

      try {
        fs.unlinkSync(legacySkillsDir);
        fs.symlinkSync(centralProviderDir, legacySkillsDir);
        console.log(`   ✓ Updated symlink to centralized location`);
      } catch (error) {
        console.error(`   ❌ Failed to update symlink: ${error.message}`);
        return null;
      }

      return null;
    }
  }

  // Real directory exists - backup and migrate
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = `${legacySkillsDir}.backup-${timestamp}`;

  console.log(`   📦 Backing up existing skills to ${backupDir}`);

  try {
    fs.renameSync(legacySkillsDir, backupDir);
  } catch (error) {
    console.error(`   ❌ Failed to backup directory: ${error.message}`);
    return null;
  }

  // Verify backup directory exists before proceeding
  if (!fs.existsSync(backupDir)) {
    console.error(`   ❌ Backup directory ${backupDir} does not exist`);
    return null;
  }

  // Scan for non-impeccable skills
  const backupSkills = fs.readdirSync(backupDir).filter(
    s => fs.statSync(path.join(backupDir, s)).isDirectory()
  );
  const nonImpeccableSkills = backupSkills.filter(s => !impeccableSkills.includes(s));

  if (nonImpeccableSkills.length > 0) {
    console.log(`\n   ⚠️  Found ${nonImpeccableSkills.length} non-impeccable skills in backup:`);
    for (const skill of nonImpeccableSkills) {
      console.log(`      - ${skill}`);
    }
    console.log(`\n   To restore these to centralized location:`);
    for (const skill of nonImpeccableSkills.slice(0, 3)) {
      console.log(`      mv "${backupDir}/${skill}" "${centralProviderDir}/"`);
    }
    if (nonImpeccableSkills.length > 3) {
      console.log(`      ... and ${nonImpeccableSkills.length - 3} more`);
    }
    console.log();
  }

  // Create provider-level symlink
  try {
    // Create parent directory if it doesn't exist
    fs.mkdirSync(path.dirname(legacySkillsDir), { recursive: true });
    fs.symlinkSync(centralProviderDir, legacySkillsDir);
    console.log(`   ✓ Created ${legacySkillsDir} → ${centralProviderDir}`);
    return backupDir;
  } catch (error) {
    console.error(`   ❌ Failed to create provider symlink: ${error.message}`);
    return null;
  }
}

/**
 * Install symlinks for a provider
 */
function installProvider(providerName, manifest) {
  const config = PROVIDERS[providerName];
  if (!config) {
    console.error(`❌ Unknown provider: ${providerName}`);
    return false;
  }

  console.log(`📦 Installing ${config.label} (${config.dir})...`);

  const localProviderDir = path.join(ROOT_DIR, config.dir);
  const centralProviderDir = path.join(HOME_DIR, '.TOOLS/skills', providerName);

  // Check if local provider directory exists
  if (!fs.existsSync(localProviderDir)) {
    console.warn(`⚠️  Local ${config.dir} directory not found, skipping`);
    return false;
  }

  // Create centralized provider directory
  if (!fs.existsSync(centralProviderDir)) {
    fs.mkdirSync(centralProviderDir, { recursive: true });
    console.log(`   Created ${centralProviderDir}`);
  }

  // Get all skill directories
  const skills = getSkillDirs(localProviderDir);
  if (skills.length === 0) {
    console.warn(`⚠️  No skills found in ${localProviderDir}/skills`);
    return false;
  }

  // Create symlinks for each skill
  let successCount = 0;
  for (const skill of skills) {
    const target = path.join(localProviderDir, 'skills', skill);
    const linkPath = path.join(centralProviderDir, skill);

    if (createSkillSymlink(target, linkPath, skill)) {
      successCount++;
    }
  }

  console.log(`   ✓ Installed ${successCount}/${skills.length} skills`);

  // Migrate legacy directory
  const backupDir = migrateLegacyDirectory(providerName, config, centralProviderDir, skills);

  // Add to manifest
  addProviderToManifest(manifest, providerName, skills, backupDir);

  console.log();
  return true;
}

/**
 * Display installation summary
 */
function displaySummary(providers) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Centralized installation complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📦 Centralized location: ~/.TOOLS/skills/\n');

  console.log('Installed providers:');
  for (const provider of providers) {
    const config = PROVIDERS[provider];
    if (config) {
      console.log(`  • ${config.label} (${config.dir})`);
      console.log(`    ~/.TOOLS/skills/${provider}/ ← impeccable skills`);
      console.log(`    ${config.dir}/skills/ → ~/.TOOLS/skills/${provider}/`);
    }
  }
  console.log('\n📝 Next steps:');
  console.log('  1. Changes to this repo are now live everywhere');
  console.log('  2. Run `bun run build` after modifying source files');
  console.log('  3. Run `git pull && bun run build` for upstream updates');
  console.log('  4. Add other skills: ln -s /path/to/skill ~/.TOOLS/skills/claude/');
  console.log('\n💡 Useful commands:');
  console.log('  • Validate installation: bun run validate-local');
  console.log('  • List Claude skills: ls -la ~/.TOOLS/skills/claude/');
  console.log('  • Check symlinks: readlink ~/.claude/skills');
  console.log('  • Uninstall: bun run uninstall-local');
}

/**
 * Main installation process
 */
function install() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Impeccable Local Installation Setup  ║');
  console.log('╚════════════════════════════════════════╝\n');

  const { providers } = parseArgs();

  console.log(`Target providers: ${providers.join(', ')}\n`);

  // Build the project
  buildProject();

  // Create centralized root directory
  createCentralizedDirs();

  // Read or initialize manifest
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  } catch (error) {
    console.error('❌ Failed to read package.json:', error.message);
    console.error('Ensure package.json exists and is readable');
    process.exit(1);
  }

  let manifest = readManifest();

  if (!manifest) {
    manifest = initManifest(packageJson.version);
    console.log('📝 Initializing installation manifest\n');
  } else {
    console.log('📝 Updating existing installation\n');
  }

  // Install symlinks for each provider
  for (const provider of providers) {
    installProvider(provider, manifest);
  }

  // Write manifest
  try {
    writeManifest(manifest);
    console.log('✓ Manifest updated\n');
  } catch (error) {
    console.error('❌ Critical: Failed to write manifest:', error.message);
    console.error('This could indicate a permissions issue or disk problem.');
    console.error('Please check:');
    console.error('1. Permissions for ~/.TOOLS/skills/ directory');
    console.error('2. Available disk space');
    console.error('3. Any file system errors');
    process.exit(1);
  }

  // Display summary
  displaySummary(providers);
}

// Run installation
install();
