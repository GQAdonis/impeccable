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

// Manifest utilities will be imported in a future task

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
 * Install symlinks for a provider
 */
function installProvider(providerName) {
  const config = PROVIDERS[providerName];
  if (!config) {
    console.error(`❌ Unknown provider: ${providerName}`);
    return;
  }

  console.log(`📦 Installing ${config.label} (${config.dir})...`);

  const localProviderDir = path.join(ROOT_DIR, config.dir);
  const globalProviderDir = path.join(HOME_DIR, config.dir);
  const globalSkillsDir = path.join(globalProviderDir, 'skills');

  // Check if local provider directory exists
  if (!fs.existsSync(localProviderDir)) {
    console.warn(`⚠️  Local ${config.dir} directory not found, skipping`);
    return;
  }

  // Create global skills directory if it doesn't exist
  if (!fs.existsSync(globalSkillsDir)) {
    fs.mkdirSync(globalSkillsDir, { recursive: true });
    console.log(`   Created ${globalSkillsDir}`);
  }

  // Get all skill directories
  const skills = getSkillDirs(localProviderDir);
  if (skills.length === 0) {
    console.warn(`⚠️  No skills found in ${localProviderDir}/skills`);
    return;
  }

  // Create symlinks for each skill
  let successCount = 0;
  for (const skill of skills) {
    const target = path.join(localProviderDir, 'skills', skill);
    const linkPath = path.join(globalSkillsDir, skill);

    if (createSkillSymlink(target, linkPath, skill)) {
      successCount++;
    }
  }

  console.log(`   ✓ Installed ${successCount}/${skills.length} skills\n`);
}

/**
 * Display installation summary
 */
function displaySummary(providers) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Local installation complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Installed providers:');
  for (const provider of providers) {
    const config = PROVIDERS[provider];
    if (config) {
      console.log(`  • ${config.label} (${config.dir})`);
    }
  }
  console.log('\n📝 Next steps:');
  console.log('  1. Any updates to this repo are now live everywhere');
  console.log('  2. Run `bun run build` after making changes to source files');
  console.log('  3. Run `git pull` to get upstream updates');
  console.log('\n💡 Tips:');
  console.log('  • To see linked skills: ls -l ~/.claude/skills/');
  console.log('  • To uninstall: rm ~/.claude/skills/{skill-name}');
  console.log('  • To reinstall: bun run scripts/install-local.js');
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

  // Create centralized directories
  createCentralizedDirs();

  // Install symlinks for each provider
  for (const provider of providers) {
    installProvider(provider);
  }

  // Display summary
  displaySummary(providers);
}

// Run installation
install();
