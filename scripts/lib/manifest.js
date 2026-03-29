// scripts/lib/manifest.js

import path from 'path';
import fs from 'fs';

const HOME_DIR = process.env.HOME || process.env.USERPROFILE;
const MANIFEST_PATH = path.join(HOME_DIR, '.TOOLS/skills/.impeccable-manifest.json');

/**
 * Read manifest file
 * @returns {Object|null} Manifest object or null if doesn't exist
 */
export function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return null;
  }

  try {
    const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Manifest file is corrupted (invalid JSON): ${error.message}`);
      console.error(`Location: ${MANIFEST_PATH}`);
      console.error(`Fix: Delete the file and reinstall: rm "${MANIFEST_PATH}" && bun run install-local`);
    } else {
      console.error(`Failed to read manifest: ${error.message}`);
    }
    return null;
  }
}

/**
 * Write manifest file
 * @param {Object} manifest - Manifest object to write
 */
export function writeManifest(manifest) {
  const dir = path.dirname(MANIFEST_PATH);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (error) {
    console.error(`Failed to write manifest: ${error.message}`);
    throw error;
  }
}

/**
 * Initialize a new manifest
 * @param {string} version - Package version
 * @returns {Object} New manifest object
 */
export function initManifest(version) {
  return {
    installedAt: new Date().toISOString(),
    version: version,
    providers: {}
  };
}

/**
 * Add provider to manifest
 * @param {Object} manifest - Manifest object
 * @param {string} provider - Provider name
 * @param {Array<string>} skills - List of skill names
 * @param {string|null} legacyBackup - Path to legacy backup if created
 */
export function addProviderToManifest(manifest, provider, skills, legacyBackup = null) {
  manifest.providers[provider] = {
    skills: skills,
    legacyBackup: legacyBackup
  };
}

/**
 * Check if provider is in manifest
 * @param {Object} manifest - Manifest object
 * @param {string} provider - Provider name
 * @returns {boolean}
 */
export function hasProvider(manifest, provider) {
  return manifest && manifest.providers && manifest.providers[provider] !== undefined;
}

/**
 * Get provider data from manifest
 * @param {Object} manifest - Manifest object
 * @param {string} provider - Provider name
 * @returns {Object|null} Provider data or null
 */
export function getProvider(manifest, provider) {
  if (!hasProvider(manifest, provider)) {
    return null;
  }
  return manifest.providers[provider];
}

/**
 * Remove provider from manifest
 * @param {Object} manifest - Manifest object
 * @param {string} provider - Provider name
 */
export function removeProvider(manifest, provider) {
  if (manifest && manifest.providers) {
    delete manifest.providers[provider];
  }
}
