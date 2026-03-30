#!/usr/bin/env node

/**
 * Validation Script for Centralized Skills Installation
 *
 * Validates symlink integrity, build freshness, and installation health.
 *
 * Usage:
 *   bun run scripts/validate-local.js
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PROVIDERS } from './lib/transformers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const HOME_DIR = process.env.HOME || process.env.USERPROFILE;

/**
 * Validate provider symlinks and skills
 */
function validateProvider(providerName) {
  const config = PROVIDERS[providerName];
  if (!config) return null;

  const legacyDir = path.join(HOME_DIR, config.configDir, 'skills');
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

      try {
        const stats = fs.lstatSync(linkPath);

        if (stats.isSymbolicLink()) {
          const target = fs.readlinkSync(linkPath);

          if (fs.existsSync(target)) {
            result.skills.valid++;

            // Check if build is stale
            const sourceFile = path.join(ROOT_DIR, 'source/skills', skill, 'skill.md');
            if (fs.existsSync(sourceFile)) {
              const sourceStat = fs.statSync(sourceFile);
              const targetFile = path.join(target, 'skill.md');

              if (fs.existsSync(targetFile)) {
                const targetStat = fs.statSync(targetFile);

                if (sourceStat.mtimeMs > targetStat.mtimeMs) {
                  result.skills.stale++;
                  result.issues.push(
                    `${providerName}/${skill} build is stale (source newer than build)`
                  );
                }
              }
            }
          } else {
            result.skills.broken++;
            result.issues.push(`${providerName}/${skill} → ${target} (target missing)`);
          }
        } else {
          result.issues.push(`${providerName}/${skill} is not a symlink`);
        }
      } catch (error) {
        result.issues.push(`${providerName}/${skill}: ${error.message}`);
      }
    }
  }

  return result;
}

/**
 * Check for backup directories
 */
function checkBackups() {
  const backups = [];

  for (const [providerName, config] of Object.entries(PROVIDERS)) {
    const skillsDir = path.join(HOME_DIR, config.configDir);

    if (!fs.existsSync(skillsDir)) continue;

    const entries = fs.readdirSync(skillsDir);
    const backupDirs = entries.filter(e => e.startsWith('skills.backup-'));

    for (const backupDir of backupDirs) {
      const backupPath = path.join(skillsDir, backupDir);
      const skills = fs.readdirSync(backupPath).filter(
        s => fs.statSync(path.join(backupPath, s)).isDirectory()
      );

      backups.push({
        provider: providerName,
        path: backupPath,
        skillCount: skills.length,
        skills: skills
      });
    }
  }

  return backups;
}

/**
 * Display validation report
 */
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

    if (result.skills.total > 0) {
      console.log(`   ${result.label}: ${result.skills.total} skills`);
      console.log(`      ✓ ${result.skills.valid} valid`);
      if (result.skills.broken > 0) {
        console.log(`      ❌ ${result.skills.broken} broken`);
      }
      if (result.skills.stale > 0) {
        console.log(`      ⚠️  ${result.skills.stale} stale`);
      }
    }
  }

  if (totalSkills > 0) {
    console.log(`\n   Total: ${totalSkills} skills`);
    console.log(`   ✓ ${totalValid} valid`);
    if (totalBroken > 0) console.log(`   ❌ ${totalBroken} broken`);
    if (totalStale > 0) console.log(`   ⚠️  ${totalStale} stale`);
  }

  // Backups
  if (backups.length > 0) {
    console.log('\n📦 Backups found:\n');
    for (const backup of backups) {
      console.log(`   ${backup.path}`);
      console.log(`      ${backup.skillCount} skills: ${backup.skills.slice(0, 5).join(', ')}${backup.skills.length > 5 ? '...' : ''}`);
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
  } else if (totalSkills > 0) {
    console.log('\n✨ All systems nominal! Installation is valid.\n');
  } else {
    console.log('\n⚠️  No skills installed. Run: bun run install-local\n');
  }
}

/**
 * Main validation
 */
function validate() {
  const providers = Object.keys(PROVIDERS);
  const results = providers.map(validateProvider).filter(Boolean);
  const backups = checkBackups();

  displayReport(results, backups);

  // Exit code
  const hasIssues = results.some(r => r.issues.length > 0);
  process.exit(hasIssues ? 1 : 0);
}

validate();