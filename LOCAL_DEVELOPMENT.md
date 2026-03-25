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
2. **Creates symlinks** - Links `~/.claude/skills/*` → `./impeccable/.claude/skills/*`
3. **Enables live updates** - Changes in this repo are immediately available everywhere

## Benefits

✅ **No manual copying** - Updates flow automatically to all tools
✅ **Test in real-time** - Edit skills and see changes immediately
✅ **Pull upstream updates** - `git pull` updates all tools instantly
✅ **Multi-provider sync** - One source of truth for all AI tools

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

# Rebuild
bun run build

# All tools now have the latest skills!
```

### Testing Locally

Since symlinks point to this repo, you can:

- Edit skills directly in `.claude/skills/` (they'll be overwritten on rebuild)
- Test changes in any AI tool immediately
- Iterate without reinstalling

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

## Installation Examples

```bash
# Install all providers (default)
bun run install-local

# Install only Claude Code
bun run install-local -- --providers=claude

# Install multiple specific providers
bun run install-local -- --providers=claude,cursor,agents
```

## Verification

Check that symlinks were created:

```bash
# List Claude skills
ls -la ~/.claude/skills/

# Verify a symlink points to this repo
readlink ~/.claude/skills/polish
# Should show: /Users/you/path/to/impeccable/.claude/skills/polish
```

## Uninstallation

To remove symlinks and restore normal installation:

```bash
# Remove all provider symlinks
bun run uninstall-local

# Remove specific providers only
bun run uninstall-local -- --providers=claude,cursor
```

This removes only impeccable symlinks - it won't touch other skills in your global directories.

## Troubleshooting

### Symlinks don't appear

**Problem:** After installation, skills don't show up in your AI tool.

**Solution:** Restart the AI tool or reload your shell configuration.

### Can't remove existing directory

**Problem:** `⚠️ ~/.claude/skills/polish is a directory (not a symlink)`

**Solution:** The script won't overwrite real directories. Move or backup manually first:

```bash
mv ~/.claude/skills/polish ~/.claude/skills/polish.backup
bun run install-local
```

### Changes not appearing

**Problem:** Edited skills don't show up in AI tools.

**Solution:** Make sure you ran `bun run build` after editing source files. The build process compiles `source/` → provider directories.

### Symlink points to wrong location

**Problem:** Symlink exists but points to an old location.

**Solution:** Uninstall and reinstall:

```bash
bun run uninstall-local
bun run install-local
```

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
