# Local Development Setup

This guide explains how to set up impeccable for local development with global symbolic links, so that all your AI tools immediately consume changes from this repository.

## Quick Start

```bash
# Build and install globally with symlinks
bun run install-local

# Or install specific providers only
bun run install-local -- --providers=claude,cursor
```

## What This Does

The `install-local` script:

1. **Builds the project** - Compiles source skills to all provider formats
2. **Creates centralized directory** - Sets up `~/.TOOLS/skills/{provider}/` structure
3. **Creates individual skill symlinks** - Links each skill: `~/.TOOLS/skills/claude/polish/` → `./impeccable/.claude/skills/polish/`
4. **Migrates legacy directories** - Backs up and replaces `~/.claude/skills/` with symlink to centralized location
5. **Enables live updates** - Changes in this repo are immediately available everywhere
6. **Tracks installation** - Creates manifest at `~/.TOOLS/skills/.impeccable-manifest.json`

## Benefits

✅ **Single source of truth** - All skills in `~/.TOOLS/skills/` across all providers
✅ **No manual copying** - Updates flow automatically to all tools
✅ **Test in real-time** - Edit skills and see changes immediately
✅ **Pull upstream updates** - `git pull` updates all tools instantly
✅ **Multi-provider sync** - One location for all AI tools
✅ **Mixed sources** - Supports impeccable + third-party skills in same location
✅ **Backwards compatible** - Tools still read from `~/.claude/skills/` via symlink

## Architecture

**Directory Structure:**
```
~/.TOOLS/
└── skills/
    ├── claude/                    # All Claude skills
    │   ├── polish/               # → ./impeccable/.claude/skills/polish/
    │   ├── audit/                # → ./impeccable/.claude/skills/audit/
    │   └── my-custom-skill/      # → ~/other-project/skills/my-custom/
    ├── cursor/                    # All Cursor skills
    └── ...

~/.claude/
└── skills/                        # → ~/.TOOLS/skills/claude/

./impeccable/
├── source/skills/                 # Edit these
├── .claude/skills/                # Build output
└── ...
```

**Resolution Flow:**
1. Claude Code reads `~/.claude/skills/polish/skill.md`
2. Resolves: `~/.claude/skills/` → `~/.TOOLS/skills/claude/`
3. Resolves: `~/.TOOLS/skills/claude/polish/` → `./impeccable/.claude/skills/polish/`
4. Reads: `./impeccable/.claude/skills/polish/skill.md`

**Key Properties:**
- Two-level symlink indirection (transparent to tools)
- Zero file duplication
- Supports mixed skill sources
- Build artifacts remain in project for inspection

## Workflow

### Making Changes

```bash
# 1. Edit source files in source/
vim source/skills/polish/skill.md

# 2. Rebuild
bun run build

# 3. Changes are now live in all tools!
# No need to copy or reinstall
```

### Getting Upstream Updates

```bash
# Pull latest from GitHub
git pull origin main

# Rebuild and refresh symlinks
bun run build
bun run install-local
```

## Validation

Check installation health:

```bash
# Validate all symlinks and build freshness
bun run validate-local
```

**Example output:**

```
╔════════════════════════════════════════════════════╗
║       Centralized Skills Installation Report      ║
╚════════════════════════════════════════════════════╝

📍 Provider-level symlinks:

   ✓ Claude Code: ~/.TOOLS/skills/claude
   ✓ Cursor: ~/.TOOLS/skills/cursor
   ...

📦 Skills by provider:

   Claude Code: 21 skills
      ✓ 21 valid
   Cursor: 21 skills
      ✓ 21 valid

   Total: 210 skills
   ✓ 210 valid

✨ All systems nominal! Installation is valid.
```

**What it checks:**
- Provider-level symlink integrity (`~/.claude/skills/` → `~/.TOOLS/skills/claude/`)
- Individual skill symlink validity
- Broken symlinks (target doesn't exist)
- Stale builds (source newer than build)
- Backup directory detection

## Verification

Check that symlinks were created:

```bash
# Validate installation (recommended)
bun run validate-local

# Manual checks
ls -la ~/.claude/skills/              # Should be symlink
readlink ~/.claude/skills             # Should show ~/.TOOLS/skills/claude

ls -la ~/.TOOLS/skills/claude/        # Should show all skills
readlink ~/.TOOLS/skills/claude/polish # Should show ./impeccable/.claude/skills/polish

# List all skills across all providers
ls -la ~/.TOOLS/skills/*/
```

## Troubleshooting

### General Installation Issues

**Problem:** Symlinks not created or broken
**Solution:**
- Verify you have `bun` installed
- Run `bun run uninstall-local`
- Run `bun run build`
- Run `bun run install-local`

### Installation validation fails

**Problem:** `bun run validate-local` reports issues.

**Solution:** Check the specific issues reported:

- **Broken symlinks:** Run `bun run build && bun run install-local`
- **Stale builds:** Run `bun run build`
- **Wrong symlink targets:** Run `bun run uninstall-local && bun run install-local`
- **Provider symlink missing:** Run `bun run install-local`

### Custom skills not visible

**Problem:** Added skills to `~/.TOOLS/skills/claude/` but they don't appear.

**Solution:** Verify the directory structure:

```bash
ls -la ~/.TOOLS/skills/claude/my-skill/
# Should contain skill.md

readlink ~/.claude/skills
# Should point to ~/.TOOLS/skills/claude

# Restart AI tool or reload configuration
```

## Supported Providers

The following providers are supported:

- **claude** - Claude Code (`.claude/`)
- **cursor** - Cursor (`.cursor/`)
- **gemini** - Gemini CLI (`.gemini/`)
- **codex** - Codex CLI (`.codex/`)
- **agents** - VS Code Copilot / Antigravity (`.agents/`)
- **kiro** - Kiro (`.kiro/`)
- **opencode** - OpenCode (`.opencode/`)
- **pi** - Pi (`.pi/`)
- **trae** - Trae International (`.trae/`)
- **trae-cn** - Trae China (`.trae-cn/`)

## Uninstallation

To remove symlinks and restore normal installation:

```bash
# Remove all provider symlinks
bun run uninstall-local

# Remove specific providers only
bun run uninstall-local -- --providers=claude,cursor
```

This removes only impeccable symlinks - it won't touch other skills in your global directories.

## How It Works

### Directory Structure

```
impeccable/
├── source/                    # Source skills (edit these)
│   └── skills/
│       └── polish/
│           └── skill.md
├── .claude/                   # Compiled Claude skills
│   └── skills/
│       └── polish/
│           └── skill.md       # Built from source
└── scripts/
    ├── build.js              # Compiles source → providers
    ├── install-local.js      # Creates global symlinks
    └── uninstall-local.js    # Removes symlinks
```

### Installation Process

1. `build.js` compiles `source/` into provider-specific formats
2. `install-local.js` creates symlinks:
   - From: `~/.claude/skills/polish`
   - To: `./impeccable/.claude/skills/polish`
3. Claude Code now reads skills from your local repo
4. Any changes to this repo immediately affect Claude

### Build Process

The build system:

1. Reads skills from `source/skills/`
2. Applies provider-specific transformations
3. Outputs to `.claude/`, `.cursor/`, `.gemini/`, etc.
4. Each provider gets correctly formatted skills

## Best Practices

### Development Cycle

1. **Edit source files** - Always edit `source/skills/`, never provider dirs
2. **Build** - Run `bun run build` to compile changes
3. **Test** - Use skills in your AI tool
4. **Commit** - Commit source files, not provider dirs

### Version Control

```bash
# Provider directories are built artifacts
# They're in .gitignore (except for the project itself)

# Only commit:
- source/
- scripts/
- public/

# Don't commit:
- dist/
- build/
```

### Updating From Upstream

```bash
# Get latest changes
git pull origin main

# Rebuild
bun run build

# Symlinks automatically point to new builds
```

## Integration with CI/CD

The standard `bun run build` command still works for CI/CD:

- Builds all provider formats
- Creates distribution ZIPs
- Generates static site

Local symlinks don't affect production builds.

## Related Commands

```bash
# Build only (no installation)
bun run build

# Clean and rebuild
bun run rebuild

# Remove build artifacts
bun run clean

# Development server
bun run dev

# Deploy to production
bun run deploy
```