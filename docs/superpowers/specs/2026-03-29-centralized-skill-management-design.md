# Centralized AI Tool Skill Management

**Date:** 2026-03-29
**Status:** Approved
**Approach:** Minimal Migration with Symlinks

## Executive Summary

This design establishes `~/.TOOLS/skills/` as a centralized location for all AI tool skills across providers (Claude, Cursor, Gemini, etc.), eliminating file duplication while supporting mixed sources. The implementation uses a two-level symlink architecture: individual skills symlink from centralized location to build artifacts, and legacy provider directories symlink to centralized directories.

**Key Benefits:**
- Zero file duplication across all providers
- Single source of truth for skill management
- Supports impeccable + third-party skills in same location
- Backwards compatible with existing tool configurations
- Minimal code changes (modify install-local.js only)

## Architecture Overview

### Core Concept

**Single Source of Truth:** `~/.TOOLS/skills/{provider}/` contains all skills (impeccable + others)

**Build Location:** Impeccable builds to local `./{provider}/skills/` for testing and inspection

**Installation:** Symlinks connect build artifacts to centralized location

**Tool Integration:** Legacy paths (e.g., `~/.claude/skills/`) become symlinks to centralized paths

### Directory Structure

```
~/.TOOLS/
└── skills/
    ├── claude/                    # All Claude skills (impeccable + others)
    │   ├── polish/               # → symlink to ./impeccable/.claude/skills/polish/
    │   ├── audit/                # → symlink to ./impeccable/.claude/skills/audit/
    │   ├── animate/              # → symlink to ./impeccable/.claude/skills/animate/
    │   └── my-custom-skill/      # → symlink to ~/other-project/skills/my-custom/
    ├── cursor/                    # All Cursor skills
    │   ├── polish/               # → symlink to ./impeccable/.cursor/skills/polish/
    │   └── ...
    ├── gemini/                    # All Gemini skills
    ├── codex/                     # All Codex skills
    ├── agents/                    # All VS Code Copilot / Antigravity skills
    ├── kiro/                      # All Kiro skills
    ├── opencode/                  # All OpenCode skills
    ├── pi/                        # All Pi skills
    ├── trae/                      # All Trae International skills
    └── trae-cn/                   # All Trae China skills

~/.claude/
└── skills/                        # → symlink to ~/.TOOLS/skills/claude/

~/.cursor/
└── skills/                        # → symlink to ~/.TOOLS/skills/cursor/

~/.gemini/
└── skills/                        # → symlink to ~/.TOOLS/skills/gemini/

[... same pattern for all providers ...]

./impeccable/
├── source/skills/                 # Source files (edit these)
│   ├── polish/
│   ├── audit/
│   └── ...
├── .claude/skills/                # Built Claude-specific skills (local testing)
│   ├── polish/
│   ├── audit/
│   └── ...
├── .cursor/skills/                # Built Cursor-specific skills (local testing)
│   ├── polish/
│   ├── audit/
│   └── ...
└── [... other provider builds ...]
```

### Symlink Resolution Flow

When Claude Code reads a skill:

1. Tool looks for `~/.claude/skills/polish/skill.md`
2. Resolves symlink: `~/.claude/skills/` → `~/.TOOLS/skills/claude/`
3. Resolves symlink: `~/.TOOLS/skills/claude/polish/` → `./impeccable/.claude/skills/polish/`
4. Reads: `./impeccable/.claude/skills/polish/skill.md`

**Result:** Two-level symlink indirection is transparent to tools and resolved instantly by OS.

### Key Properties

- **Zero file duplication:** All symlinks, no copied files
- **Tools see all skills:** Centralized location makes all skills visible
- **Local builds testable:** Build artifacts in project for inspection before deployment
- **Mixed sources supported:** Other skill packages can install alongside impeccable
- **Easy migration:** Backup/restore mechanism prevents data loss

## Installation Process

### Modified `install-local.js` Implementation

#### 1. Pre-flight Checks

```javascript
// Verify build completed successfully
if (!fs.existsSync(path.join(ROOT_DIR, '.claude/skills/polish'))) {
  console.log('Running build first...');
  buildProject();
}

// Check write permissions
try {
  const toolsDir = path.join(HOME_DIR, '.TOOLS');
  fs.mkdirSync(toolsDir, { recursive: true });
  fs.accessSync(toolsDir, fs.constants.W_OK);
} catch (error) {
  console.error('❌ No write permission for ~/.TOOLS/');
  console.error('   Fix: chmod +w ~/.TOOLS/');
  process.exit(1);
}
```

#### 2. For Each Provider

**a. Create Centralized Directory:**

```javascript
const centralProviderDir = path.join(HOME_DIR, '.TOOLS/skills', providerName);
fs.mkdirSync(centralProviderDir, { recursive: true });
console.log(`   Created ${centralProviderDir}`);
```

**b. Symlink Each Skill to Centralized Location:**

```javascript
const skills = getSkillDirs(localProviderDir); // e.g., ['polish', 'audit', ...]

for (const skill of skills) {
  const target = path.join(ROOT_DIR, config.dir, 'skills', skill);
  const linkPath = path.join(centralProviderDir, skill);

  // Skip if already correctly symlinked
  if (fs.existsSync(linkPath)) {
    const stats = fs.lstatSync(linkPath);
    if (stats.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(linkPath);
      if (currentTarget === target) {
        console.log(`   ⏭  ${skill} already linked`);
        continue;
      }
    } else {
      console.error(`   ❌ ${linkPath} exists but is not a symlink`);
      console.error(`      Move it first: mv "${linkPath}" "${linkPath}.backup"`);
      continue;
    }
  }

  // Create symlink
  fs.symlinkSync(target, linkPath);
  console.log(`   ✓ Linked ${skill}`);
}
```

**c. Migrate Legacy Directory:**

```javascript
const legacySkillsDir = path.join(HOME_DIR, config.dir, 'skills');

// Check if legacy directory exists and is NOT a symlink
if (fs.existsSync(legacySkillsDir)) {
  const stats = fs.lstatSync(legacySkillsDir);

  if (!stats.isSymbolicLink()) {
    // Real directory exists - backup and migrate
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = `${legacySkillsDir}.backup-${timestamp}`;

    console.log(`   📦 Backing up existing skills to ${backupDir}`);
    fs.renameSync(legacySkillsDir, backupDir);

    // Scan for non-impeccable skills
    const backupSkills = fs.readdirSync(backupDir);
    const impeccableSkills = skills; // from earlier
    const nonImpeccableSkills = backupSkills.filter(
      s => !impeccableSkills.includes(s) &&
           fs.statSync(path.join(backupDir, s)).isDirectory()
    );

    if (nonImpeccableSkills.length > 0) {
      console.log(`\n   ⚠️  Found ${nonImpeccableSkills.length} non-impeccable skills in backup:`);
      for (const skill of nonImpeccableSkills) {
        console.log(`      - ${skill}`);
      }
      console.log(`\n   To restore these to centralized location:`);
      console.log(`      mv "${backupDir}/${nonImpeccableSkills[0]}" "${centralProviderDir}/"`);
    }
  } else {
    // Already a symlink - verify it points to correct location
    const currentTarget = fs.readlinkSync(legacySkillsDir);
    const expectedTarget = centralProviderDir;

    if (currentTarget === expectedTarget) {
      console.log(`   ✓ ${legacySkillsDir} already points to centralized location`);
      return; // Done with this provider
    } else {
      console.log(`   ⚠️  ${legacySkillsDir} points to wrong location`);
      console.log(`      Current: ${currentTarget}`);
      console.log(`      Expected: ${expectedTarget}`);
      fs.unlinkSync(legacySkillsDir);
    }
  }
}

// Create provider-level symlink
fs.symlinkSync(centralProviderDir, legacySkillsDir);
console.log(`   ✓ Created ${legacySkillsDir} → ${centralProviderDir}`);
```

#### 3. Post-Install Validation

```javascript
function validateInstallation(providers) {
  console.log('\n🔍 Validating installation...\n');

  let totalSkills = 0;
  let brokenLinks = [];

  for (const provider of providers) {
    const config = PROVIDERS[provider];
    const centralDir = path.join(HOME_DIR, '.TOOLS/skills', provider);
    const legacyDir = path.join(HOME_DIR, config.dir, 'skills');

    // Check provider-level symlink
    if (!fs.existsSync(legacyDir)) {
      console.error(`   ❌ ${legacyDir} does not exist`);
      continue;
    }

    const stats = fs.lstatSync(legacyDir);
    if (!stats.isSymbolicLink()) {
      console.error(`   ❌ ${legacyDir} is not a symlink`);
      continue;
    }

    // Check each skill symlink
    const skills = fs.readdirSync(centralDir);
    for (const skill of skills) {
      const linkPath = path.join(centralDir, skill);
      const linkStats = fs.lstatSync(linkPath);

      if (linkStats.isSymbolicLink()) {
        const target = fs.readlinkSync(linkPath);
        if (!fs.existsSync(target)) {
          brokenLinks.push({ provider, skill, target });
        }
      }
    }

    totalSkills += skills.length;
    console.log(`   ✓ ${config.label}: ${skills.length} skills`);
  }

  if (brokenLinks.length > 0) {
    console.log(`\n   ⚠️  Found ${brokenLinks.length} broken symlinks:`);
    for (const { provider, skill, target } of brokenLinks) {
      console.log(`      ${provider}/${skill} → ${target} (target missing)`);
    }
  }

  console.log(`\n✨ Total: ${totalSkills} skills across ${providers.length} providers`);
}
```

#### 4. Installation Summary Display

```javascript
function displaySummary(providers) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Centralized installation complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📦 Centralized location: ~/.TOOLS/skills/\n');

  console.log('Installed providers:');
  for (const provider of providers) {
    const config = PROVIDERS[provider];
    console.log(`  • ${config.label} (${config.dir})`);
    console.log(`    ~/.TOOLS/skills/${provider}/ ← impeccable skills`);
    console.log(`    ${config.dir}/skills/ → ~/.TOOLS/skills/${provider}/`);
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
```

### Key Safety Features

- **Timestamped backups** prevent data loss
- **Won't overwrite existing symlinks** (idempotent operations)
- **Validates symlink targets exist** before creating
- **Logs all actions** for debugging
- **Reports non-impeccable skills** found in backups with restoration instructions
- **Pre-flight permission checks** prevent partial installations

## Uninstallation & Cleanup

### Modified `uninstall-local.js` Implementation

#### 1. Track Installation State

Create `~/.TOOLS/skills/.impeccable-manifest.json` during installation:

```json
{
  "installedAt": "2026-03-29T12:34:56.789Z",
  "version": "1.6.0",
  "providers": {
    "claude": {
      "skills": ["polish", "audit", "animate", ...],
      "legacyBackup": "~/.claude/skills.backup-20260329-123456"
    },
    "cursor": {
      "skills": ["polish", "audit", "animate", ...],
      "legacyBackup": null
    }
  }
}
```

#### 2. For Each Provider

**a. Remove Individual Skill Symlinks:**

```javascript
const manifest = JSON.parse(
  fs.readFileSync(path.join(HOME_DIR, '.TOOLS/skills/.impeccable-manifest.json'), 'utf8')
);

for (const provider of providers) {
  const providerManifest = manifest.providers[provider];
  if (!providerManifest) continue;

  const centralDir = path.join(HOME_DIR, '.TOOLS/skills', provider);

  for (const skill of providerManifest.skills) {
    const linkPath = path.join(centralDir, skill);

    if (fs.existsSync(linkPath)) {
      const stats = fs.lstatSync(linkPath);
      if (stats.isSymbolicLink()) {
        const target = fs.readlinkSync(linkPath);
        if (target.includes('impeccable')) {
          fs.unlinkSync(linkPath);
          console.log(`   ✓ Removed ${provider}/${skill}`);
        } else {
          console.log(`   ⏭  Keeping ${provider}/${skill} (not from impeccable)`);
        }
      }
    }
  }
}
```

**b. Remove Provider-Level Symlink:**

```javascript
const legacySkillsDir = path.join(HOME_DIR, config.dir, 'skills');

if (fs.existsSync(legacySkillsDir)) {
  const stats = fs.lstatSync(legacySkillsDir);

  if (stats.isSymbolicLink()) {
    const target = fs.readlinkSync(legacySkillsDir);
    if (target.includes('.TOOLS/skills')) {
      fs.unlinkSync(legacySkillsDir);
      console.log(`   ✓ Removed ${legacySkillsDir}`);
    }
  }
}
```

**c. Restore Backup if Available:**

```javascript
const backupDir = providerManifest.legacyBackup;

if (backupDir && fs.existsSync(backupDir)) {
  console.log(`\n   📦 Backup found: ${backupDir}`);
  console.log(`   Restore it? (y/n)`);

  // In interactive mode, prompt user
  // In automated mode, skip restoration

  if (userConfirmsRestore) {
    fs.renameSync(backupDir, legacySkillsDir);
    console.log(`   ✓ Restored ${legacySkillsDir}`);
  }
}
```

#### 3. Cleanup Empty Directories

```javascript
function cleanupEmptyDirs() {
  for (const provider of Object.keys(PROVIDERS)) {
    const providerDir = path.join(HOME_DIR, '.TOOLS/skills', provider);

    if (fs.existsSync(providerDir)) {
      const contents = fs.readdirSync(providerDir);
      if (contents.length === 0) {
        fs.rmdirSync(providerDir);
        console.log(`   ✓ Removed empty ${providerDir}`);
      }
    }
  }

  const skillsDir = path.join(HOME_DIR, '.TOOLS/skills');
  if (fs.existsSync(skillsDir)) {
    const contents = fs.readdirSync(skillsDir).filter(f => f !== '.impeccable-manifest.json');
    if (contents.length === 0) {
      fs.unlinkSync(path.join(skillsDir, '.impeccable-manifest.json'));
      fs.rmdirSync(skillsDir);
      console.log(`   ✓ Removed empty ${skillsDir}`);
    }
  }

  const toolsDir = path.join(HOME_DIR, '.TOOLS');
  if (fs.existsSync(toolsDir)) {
    const contents = fs.readdirSync(toolsDir);
    if (contents.length === 0) {
      fs.rmdirSync(toolsDir);
      console.log(`   ✓ Removed empty ${toolsDir}`);
    }
  }
}
```

### Key Safety Features

- **Only removes impeccable-managed symlinks** (tracked in manifest)
- **Preserves non-impeccable skills** in `~/.TOOLS/skills/`
- **Optional backup restoration** with user confirmation
- **Never deletes real directories**, only symlinks
- **Cleans up empty directories** to avoid clutter

## Development Workflow

### Typical Developer Actions

#### 1. Making Changes to Skills

```bash
# Edit source
vim source/skills/polish/skill.md

# Rebuild (outputs to ./{provider}/skills/)
bun run build

# Changes immediately visible in all tools
# ~/.claude/skills/ → ~/.TOOLS/skills/claude/ → ./impeccable/.claude/skills/
```

**No reinstallation needed** - symlinks automatically reflect new build artifacts.

#### 2. Pulling Upstream Updates

```bash
# Get latest from GitHub
git pull origin main

# Rebuild
bun run build

# All tools now use updated skills (no extra steps)
```

#### 3. Testing Before Global Deployment

```bash
# Build to local only
bun run build

# Inspect artifacts before deploying
ls -la .claude/skills/polish/
cat .claude/skills/polish/skill.md

# Temporarily test without affecting global
# (remove global symlinks, test, then restore)
rm ~/.claude/skills
ln -s ./impeccable/.claude/skills ~/.claude/skills
# ... test ...
rm ~/.claude/skills
ln -s ~/.TOOLS/skills/claude ~/.claude/skills

# Or just deploy globally
bun run install-local
```

#### 4. Adding Non-Impeccable Skills

```bash
# Option A: Symlink from another project
cd ~/other-skill-package
ln -s ./my-skill ~/.TOOLS/skills/claude/my-skill

# Option B: Copy directly
cp -r ./my-skill ~/.TOOLS/skills/claude/my-skill

# Skill is automatically visible to Claude via ~/.claude/skills/ symlink
# No tool restart needed (tools watch filesystem)
```

#### 5. Validating Installation

```bash
# Check symlink integrity
bun run validate-local

# Manual checks
ls -la ~/.claude/skills/              # Should show symlink
readlink ~/.claude/skills             # Should show ~/.TOOLS/skills/claude
ls -la ~/.TOOLS/skills/claude/        # Should show all skills
readlink ~/.TOOLS/skills/claude/polish # Should show ./impeccable/.claude/skills/polish
```

### Workflow Benefits

- **Edit → Build → Immediately available** (no reinstall step)
- **Can test locally** before global deployment
- **Other skills coexist naturally** in same directory
- **Git pull + build = instant updates** everywhere
- **No manual file copying** or version tracking
- **Single source of truth** for all skill management

## Error Handling & Edge Cases

### Scenario 1: Existing `~/.claude/skills/` with Non-Impeccable Skills

**Detection:**
```javascript
const legacySkillsDir = path.join(HOME_DIR, config.dir, 'skills');
if (fs.existsSync(legacySkillsDir) && !fs.lstatSync(legacySkillsDir).isSymbolicLink()) {
  // Real directory exists
}
```

**Action:**
1. Create timestamped backup: `~/.claude/skills.backup-20260329-123456`
2. Scan backup for non-impeccable skills (compare against known skill list)
3. Display in installation summary:

```
📦 Backed up existing skills to ~/.claude/skills.backup-20260329-123456

⚠️  Found 3 non-impeccable skills in backup:
   - my-custom-skill
   - another-skill
   - project-x-skill

To restore these to centralized location:
   mv ~/.claude/skills.backup-20260329-123456/my-custom-skill ~/.TOOLS/skills/claude/
   mv ~/.claude/skills.backup-20260329-123456/another-skill ~/.TOOLS/skills/claude/
   mv ~/.claude/skills.backup-20260329-123456/project-x-skill ~/.TOOLS/skills/claude/
```

**Recovery:** User can manually move skills to centralized location or keep backup.

### Scenario 2: Target Path Already Exists

**Detection:**
```javascript
const linkPath = path.join(centralProviderDir, skill);
if (fs.existsSync(linkPath)) {
  const stats = fs.lstatSync(linkPath);
  // Check what it is
}
```

**Action:**

**If it's a symlink pointing to impeccable:**
- Skip with message: `⏭  polish already linked`
- Idempotent - safe to run install multiple times

**If it's a symlink pointing elsewhere:**
- Warn and skip:
```
⚠️  ~/.TOOLS/skills/claude/polish exists but points to:
    /some/other/location/polish

Expected: ./impeccable/.claude/skills/polish

To fix, remove the existing symlink first:
    rm ~/.TOOLS/skills/claude/polish
    bun run install-local
```

**If it's a real directory:**
- Error and stop:
```
❌ ~/.TOOLS/skills/claude/polish exists but is a real directory

To fix, move it first:
    mv ~/.TOOLS/skills/claude/polish ~/.TOOLS/skills/claude/polish.backup
    bun run install-local
```

**Recovery:** User must manually resolve conflicts.

### Scenario 3: Build Artifacts Missing or Stale

**Detection:**
```javascript
const sourceFile = path.join(ROOT_DIR, 'source/skills/polish/skill.md');
const builtFile = path.join(ROOT_DIR, '.claude/skills/polish/skill.md');

if (!fs.existsSync(builtFile)) {
  console.log('Build artifacts missing');
} else {
  const sourceStat = fs.statSync(sourceFile);
  const builtStat = fs.statSync(builtFile);

  if (sourceStat.mtimeMs > builtStat.mtimeMs) {
    console.log('Build artifacts stale (source newer than build)');
  }
}
```

**Action:**
1. Auto-run `bun run build` before installation
2. If build fails:
```
❌ Build failed:
   [build error output]

Fix the build errors and try again.
```

**Recovery:** User must fix build errors first.

### Scenario 4: Broken Symlinks in `~/.TOOLS/skills/`

**Detection:**
```javascript
const skills = fs.readdirSync(centralProviderDir);
for (const skill of skills) {
  const linkPath = path.join(centralProviderDir, skill);
  const stats = fs.lstatSync(linkPath);

  if (stats.isSymbolicLink()) {
    const target = fs.readlinkSync(linkPath);
    if (!fs.existsSync(target)) {
      // Broken symlink
    }
  }
}
```

**Action:**

**During install:**
- Remove broken symlink and recreate:
```
⚠️  Broken symlink detected: ~/.TOOLS/skills/claude/polish
    Target missing: ./old-location/.claude/skills/polish
✓  Removed and recreated with correct target
```

**During uninstall:**
- Remove broken symlinks automatically:
```
✓  Cleaned up broken symlink: ~/.TOOLS/skills/claude/polish
```

**Via validation command:**
```bash
bun run validate-local

⚠️  Found 2 broken symlinks:
    claude/polish → ./impeccable/.claude/skills/polish (target missing)
    cursor/audit → ./impeccable/.cursor/skills/audit (target missing)

To fix: bun run build && bun run install-local
```

**Recovery:** Rebuild and reinstall.

### Scenario 5: Permissions Issues

**Detection:**
```javascript
try {
  const toolsDir = path.join(HOME_DIR, '.TOOLS');
  fs.mkdirSync(toolsDir, { recursive: true });
  fs.accessSync(toolsDir, fs.constants.W_OK);
} catch (error) {
  // Permission denied
}
```

**Action:**
```
❌ No write permission for ~/.TOOLS/

Check permissions:
    ls -la ~/.TOOLS/

Fix with:
    chmod +w ~/.TOOLS/

Or create directory manually:
    mkdir -p ~/.TOOLS/skills
    chmod +w ~/.TOOLS/skills
```

**Recovery:** User must fix permissions. Script never uses `sudo` automatically.

### Scenario 6: Partial Installation Failure

**Detection:**
```javascript
let successCount = 0;
let failureCount = 0;

for (const provider of providers) {
  try {
    installProvider(provider);
    successCount++;
  } catch (error) {
    console.error(`❌ Failed to install ${provider}: ${error.message}`);
    failureCount++;
  }
}

if (failureCount > 0) {
  console.log(`\n⚠️  Partial installation: ${successCount} succeeded, ${failureCount} failed`);
}
```

**Action:**
```
⚠️  Partial installation: 8 succeeded, 2 failed

Failed providers:
  • Gemini: No write permission for ~/.gemini/
  • Kiro: Build artifacts missing for .kiro/skills/

Successfully installed:
  • Claude Code
  • Cursor
  • Codex
  • Agents
  • OpenCode
  • Pi
  • Trae
  • Trae China

To retry failed providers:
    bun run install-local -- --providers=gemini,kiro
```

**Recovery:** Fix specific issues and retry with provider flag.

## Testing & Validation

### New Script: `validate-local.js`

#### Purpose

Validates the centralized installation setup to catch configuration issues before they cause problems.

#### Implementation

```javascript
#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { PROVIDERS } from './lib/transformers/index.js';

const HOME_DIR = process.env.HOME || process.env.USERPROFILE;
const ROOT_DIR = path.resolve(__dirname, '..');

function validateProviderSymlinks(providerName) {
  const config = PROVIDERS[providerName];
  if (!config) return null;

  const legacyDir = path.join(HOME_DIR, config.dir, 'skills');
  const centralDir = path.join(HOME_DIR, '.TOOLS/skills', providerName);

  const result = {
    provider: providerName,
    label: config.displayName,
    legacySymlink: { exists: false, target: null, valid: false },
    skills: { total: 0, valid: 0, broken: 0, stale: 0 },
    issues: []
  };

  // Check provider-level symlink
  if (!fs.existsSync(legacyDir)) {
    result.issues.push(`${legacyDir} does not exist`);
  } else {
    result.legacySymlink.exists = true;
    const stats = fs.lstatSync(legacyDir);

    if (stats.isSymbolicLink()) {
      result.legacySymlink.target = fs.readlinkSync(legacyDir);
      result.legacySymlink.valid = result.legacySymlink.target === centralDir;

      if (!result.legacySymlink.valid) {
        result.issues.push(
          `${legacyDir} points to wrong location:\n` +
          `  Current: ${result.legacySymlink.target}\n` +
          `  Expected: ${centralDir}`
        );
      }
    } else {
      result.issues.push(`${legacyDir} is not a symlink`);
    }
  }

  // Check each skill symlink
  if (fs.existsSync(centralDir)) {
    const skills = fs.readdirSync(centralDir);
    result.skills.total = skills.length;

    for (const skill of skills) {
      const linkPath = path.join(centralDir, skill);
      const stats = fs.lstatSync(linkPath);

      if (stats.isSymbolicLink()) {
        const target = fs.readlinkSync(linkPath);

        if (fs.existsSync(target)) {
          result.skills.valid++;

          // Check if build is stale
          const sourceFile = path.join(ROOT_DIR, 'source/skills', skill, 'skill.md');
          if (fs.existsSync(sourceFile)) {
            const sourceStat = fs.statSync(sourceFile);
            const targetStat = fs.statSync(target);

            if (sourceStat.mtimeMs > targetStat.mtimeMs) {
              result.skills.stale++;
              result.issues.push(
                `${providerName}/${skill} build is stale ` +
                `(source modified ${new Date(sourceStat.mtimeMs).toISOString()})`
              );
            }
          }
        } else {
          result.skills.broken++;
          result.issues.push(
            `${providerName}/${skill} → ${target} (target does not exist)`
          );
        }
      } else {
        result.issues.push(`${providerName}/${skill} is not a symlink`);
      }
    }
  }

  return result;
}

function checkBackups() {
  const backups = [];

  for (const [providerName, config] of Object.entries(PROVIDERS)) {
    const backupPattern = path.join(HOME_DIR, config.dir, 'skills.backup-*');
    const matches = require('glob').sync(backupPattern);

    for (const backupDir of matches) {
      const skills = fs.readdirSync(backupDir).filter(
        s => fs.statSync(path.join(backupDir, s)).isDirectory()
      );

      backups.push({
        provider: providerName,
        path: backupDir,
        skillCount: skills.length,
        skills: skills
      });
    }
  }

  return backups;
}

function displayReport(results, backups) {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║       Centralized Skills Installation Report      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Provider-level symlinks
  console.log('📍 Provider-level symlinks:\n');
  for (const result of results) {
    if (result.legacySymlink.valid) {
      console.log(`   ✓ ${result.label}: ${result.legacySymlink.target}`);
    } else if (result.legacySymlink.exists) {
      console.log(`   ❌ ${result.label}: invalid symlink`);
    } else {
      console.log(`   ❌ ${result.label}: not found`);
    }
  }

  // Skills summary
  console.log('\n📦 Skills by provider:\n');
  let totalSkills = 0;
  let totalValid = 0;
  let totalBroken = 0;
  let totalStale = 0;

  for (const result of results) {
    totalSkills += result.skills.total;
    totalValid += result.skills.valid;
    totalBroken += result.skills.broken;
    totalStale += result.skills.stale;

    console.log(`   ${result.label}: ${result.skills.total} skills`);
    console.log(`      ✓ ${result.skills.valid} valid`);
    if (result.skills.broken > 0) {
      console.log(`      ❌ ${result.skills.broken} broken`);
    }
    if (result.skills.stale > 0) {
      console.log(`      ⚠️  ${result.skills.stale} stale`);
    }
  }

  console.log(`\n   Total: ${totalSkills} skills`);
  console.log(`   ✓ ${totalValid} valid`);
  if (totalBroken > 0) console.log(`   ❌ ${totalBroken} broken`);
  if (totalStale > 0) console.log(`   ⚠️  ${totalStale} stale`);

  // Backups
  if (backups.length > 0) {
    console.log('\n📦 Backups found:\n');
    for (const backup of backups) {
      console.log(`   ${backup.path}`);
      console.log(`      ${backup.skillCount} skills: ${backup.skills.join(', ')}`);
    }
  }

  // Issues
  const allIssues = results.flatMap(r => r.issues);
  if (allIssues.length > 0) {
    console.log('\n⚠️  Issues detected:\n');
    for (const issue of allIssues) {
      console.log(`   ${issue}`);
    }
    console.log('\nTo fix issues:');
    if (totalBroken > 0) {
      console.log('   • Rebuild: bun run build');
      console.log('   • Reinstall: bun run install-local');
    }
    if (totalStale > 0) {
      console.log('   • Rebuild: bun run build');
    }
  } else {
    console.log('\n✨ All systems nominal! Installation is valid.\n');
  }
}

function validate() {
  const providers = Object.keys(PROVIDERS);
  const results = providers.map(validateProviderSymlinks).filter(Boolean);
  const backups = checkBackups();

  displayReport(results, backups);

  // Exit code
  const hasIssues = results.some(r => r.issues.length > 0);
  process.exit(hasIssues ? 1 : 0);
}

validate();
```

#### Usage

```bash
# Validate installation
bun run validate-local

# Example output (valid installation):
╔════════════════════════════════════════════════════╗
║       Centralized Skills Installation Report      ║
╚════════════════════════════════════════════════════╝

📍 Provider-level symlinks:

   ✓ Claude Code: ~/.TOOLS/skills/claude
   ✓ Cursor: ~/.TOOLS/skills/cursor
   ✓ Gemini: ~/.TOOLS/skills/gemini
   ...

📦 Skills by provider:

   Claude Code: 21 skills
      ✓ 21 valid
   Cursor: 21 skills
      ✓ 21 valid
   ...

   Total: 210 skills
   ✓ 210 valid

✨ All systems nominal! Installation is valid.
```

### Testing Strategy

#### 1. Manual Testing Scenarios

**Fresh installation:**
```bash
# Clean state
rm -rf ~/.TOOLS/skills/
rm -rf ~/.claude/skills

# Install
bun run install-local

# Validate
bun run validate-local
ls -la ~/.claude/skills/
ls -la ~/.TOOLS/skills/claude/
```

**Migration from existing installation:**
```bash
# Create fake existing skills
mkdir -p ~/.claude/skills/my-custom-skill
echo "test" > ~/.claude/skills/my-custom-skill/skill.md

# Install (should backup)
bun run install-local

# Verify backup
ls -la ~/.claude/skills.backup-*/
cat ~/.claude/skills.backup-*/my-custom-skill/skill.md
```

**Reinstallation (idempotent):**
```bash
# Run install twice
bun run install-local
bun run install-local

# Should show "already linked" messages
# Validate still works
bun run validate-local
```

**Uninstall → Reinstall:**
```bash
bun run install-local
bun run validate-local

bun run uninstall-local
# Verify removed
ls ~/.claude/skills  # Should not exist or be restored from backup

bun run install-local
bun run validate-local
```

#### 2. Automated Testing

**Unit tests for core functions:**
- `createSymlink()` - handles existing paths correctly
- `backupDirectory()` - creates timestamped backups
- `validateSymlink()` - detects broken links
- `cleanupEmptyDirs()` - only removes empty dirs

**Integration tests:**
- Full install → validate → uninstall cycle
- Mixed sources (impeccable + custom skills)
- Broken symlink detection and repair
- Stale build detection

#### 3. Edge Cases to Test

- `~/.TOOLS/` doesn't exist yet
- `~/.TOOLS/skills/` exists but is empty
- Provider directory exists with mix of symlinks and real directories
- Symlink points to non-existent target
- Build artifacts missing for some skills
- Build artifacts stale (source newer than build)
- No write permissions on `~/.TOOLS/`
- Disk full during installation
- SIGINT during installation (partial state)

## Implementation Checklist

### Files to Modify

- [ ] `scripts/install-local.js`
  - Add centralized directory creation
  - Add individual skill symlinking
  - Add legacy directory migration with backup
  - Add validation logic
  - Update summary display

- [ ] `scripts/uninstall-local.js`
  - Add manifest reading
  - Add individual skill removal (impeccable only)
  - Add provider-level symlink removal
  - Add backup restoration prompt
  - Add empty directory cleanup

- [ ] `package.json`
  - Add `validate-local` script

### Files to Create

- [ ] `scripts/validate-local.js`
  - Provider symlink validation
  - Skill symlink validation
  - Build freshness checking
  - Backup detection
  - Report generation

- [ ] `~/.TOOLS/skills/.impeccable-manifest.json` (created during install)
  - Track installation state
  - Track installed skills per provider
  - Track backup locations

### Documentation to Update

- [ ] `LOCAL_DEVELOPMENT.md`
  - Update architecture section
  - Update directory structure diagrams
  - Add `~/.TOOLS/skills/` information
  - Add validation command
  - Update troubleshooting section

- [ ] `INSTALLATION_SUMMARY.md`
  - Update for centralized architecture
  - Add validation instructions

- [ ] `README.md`
  - Update installation instructions
  - Mention centralized approach

### Testing Requirements

- [ ] Test on macOS (primary platform)
- [ ] Test on Linux (if supported)
- [ ] Test on Windows (if supported)
- [ ] Test fresh installation
- [ ] Test migration from old setup
- [ ] Test with existing non-impeccable skills
- [ ] Test reinstallation (idempotent)
- [ ] Test uninstall → reinstall cycle
- [ ] Test validation command
- [ ] Test all error scenarios

## Migration Path for Existing Users

### Step-by-Step Migration

**Current state:** Users have `~/.claude/skills/` pointing directly to `./impeccable/.claude/skills/`

**Desired state:** Users have `~/.claude/skills/` → `~/.TOOLS/skills/claude/` → `./impeccable/.claude/skills/`

**Migration process (automatic):**

1. User runs `git pull origin main` (gets updated scripts)
2. User runs `bun run install-local`
3. Script detects existing `~/.claude/skills/` symlink
4. Script automatically:
   - Creates `~/.TOOLS/skills/claude/`
   - Symlinks individual skills to centralized location
   - Removes old `~/.claude/skills/` symlink
   - Creates new `~/.claude/skills/` → `~/.TOOLS/skills/claude/` symlink
5. Skills continue working without interruption (two-level indirection is transparent)

**Rollback (if needed):**

```bash
# Uninstall new setup
bun run uninstall-local

# Restore old setup
rm ~/.claude/skills
ln -s ./impeccable/.claude/skills ~/.claude/skills
```

### Communication to Users

**Release notes:**

```markdown
## v1.7.0 - Centralized Skill Management

### What's New

We've introduced a centralized skill management system that makes it easier to use skills from multiple sources.

**Key changes:**
- All skills now centralized in `~/.TOOLS/skills/` (single source of truth)
- Supports mixing impeccable skills with your custom skills
- Automatic migration preserves existing skills
- Validation command to check installation health

**What you need to do:**
1. Pull latest changes: `git pull origin main`
2. Run installation: `bun run install-local`
3. Validate setup: `bun run validate-local`

**What stays the same:**
- All your existing skills continue to work
- Same commands (`bun run build`, etc.)
- Same workflow (edit → build → use)

**What's better:**
- Add custom skills anywhere: `ln -s /path/to/skill ~/.TOOLS/skills/claude/my-skill`
- One place to manage all skills across all AI tools
- Better error reporting and validation

See `LOCAL_DEVELOPMENT.md` for complete documentation.
```

## Alternatives Considered

### Alternative 1: Build Directly to `~/.TOOLS/skills/`

**Description:** Modify build system to output directly to centralized location instead of local provider directories.

**Pros:**
- Single symlink layer instead of two
- Cleaner runtime resolution

**Cons:**
- More complex build system changes
- Harder to test locally before global deployment
- Requires different mode for development vs production
- Loses visibility into build artifacts in project directory

**Decision:** Rejected - adds complexity without significant benefit

### Alternative 2: Dual-Mode Configuration

**Description:** Support both legacy (direct) and centralized modes via config file.

**Pros:**
- Easier migration for teams
- Supports different workflows

**Cons:**
- Most complex implementation
- Two code paths to maintain and test
- Config file adds cognitive overhead
- Users might not understand which mode they're in

**Decision:** Rejected - unnecessary complexity for solved problem

### Alternative 3: No Provider-Level Symlink

**Description:** Keep `~/.claude/skills/` as real directory pointing directly to centralized skills without intermediate symlink.

**Pros:**
- Single symlink layer
- Slightly simpler

**Cons:**
- Tools must be configured to look in `~/.TOOLS/skills/claude/` instead of `~/.claude/skills/`
- Requires tool-specific configuration changes
- Less backwards compatible
- Harder to migrate existing setups

**Decision:** Rejected - breaks backwards compatibility

## Success Criteria

### Installation Success

- [ ] Running `bun run install-local` completes without errors
- [ ] All provider-level symlinks created: `~/.claude/skills/` → `~/.TOOLS/skills/claude/`
- [ ] All skill symlinks created in `~/.TOOLS/skills/{provider}/`
- [ ] Existing non-impeccable skills backed up safely
- [ ] Validation passes: `bun run validate-local` exits 0
- [ ] Skills load successfully in all AI tools

### Workflow Success

- [ ] Edit source → build → skills updated (no reinstall needed)
- [ ] Git pull → build → skills updated everywhere
- [ ] Can add custom skills to `~/.TOOLS/skills/{provider}/`
- [ ] Custom skills appear in tools alongside impeccable skills
- [ ] Validation detects broken symlinks
- [ ] Validation detects stale builds

### Migration Success

- [ ] Existing users can migrate without data loss
- [ ] Non-impeccable skills preserved in backups
- [ ] Clear instructions for restoring custom skills
- [ ] Rollback process works if needed
- [ ] Zero downtime during migration

### Uninstallation Success

- [ ] Running `bun run uninstall-local` removes only impeccable skills
- [ ] Non-impeccable skills remain in `~/.TOOLS/skills/`
- [ ] Backups can be restored
- [ ] Empty directories cleaned up
- [ ] No broken symlinks left behind

## Future Enhancements

### Possible Improvements (Not in Initial Release)

1. **Auto-rebuild on file change:**
   ```bash
   bun run dev-local  # Watches source/ and rebuilds on change
   ```

2. **Skill version management:**
   - Track which version of impeccable is installed
   - Warn if local repo is behind upstream
   - Show changelog on upgrade

3. **Multi-repo skill aggregation:**
   - Support installing from multiple skill repositories
   - Manage dependencies between skill packages
   - Conflict resolution for duplicate skill names

4. **Health monitoring:**
   - Periodic validation checks
   - Alert on broken symlinks
   - Suggest rebuilds when source changes

5. **Interactive migration tool:**
   - Guide users through migration with prompts
   - Preview changes before applying
   - Rollback with one command

6. **Provider detection:**
   - Auto-detect which AI tools are installed
   - Only install relevant providers
   - Skip providers that aren't in use

7. **Skill marketplace integration:**
   - Discover skills from community
   - Install third-party skills to `~/.TOOLS/skills/`
   - Update all skills from all sources

These enhancements are intentionally deferred to keep initial implementation focused and testable.

## Conclusion

This design establishes `~/.TOOLS/skills/` as a centralized, single source of truth for AI tool skills across all providers. Using a two-level symlink architecture (provider-level + individual skills), we achieve zero file duplication while maintaining backwards compatibility and supporting mixed skill sources.

The minimal migration approach requires only modifications to existing `install-local.js` and `uninstall-local.js` scripts, plus a new `validate-local.js` utility. Build system remains unchanged, keeping implementation simple and testable.

Key success factors:
- Automatic backup and migration of existing skills
- Clear error messages and recovery instructions
- Validation tooling to catch issues early
- Comprehensive documentation for users

Next steps: Create implementation plan with writing-plans skill.
