# Impeccable - Local Installation Summary

## ✅ Installation Complete!

Your local development environment has been successfully configured with symbolic links to this repository.

## What Was Installed

**21 skills** installed across **10 AI tool providers**:

- **Claude Code** (`~/.claude/skills/`)
- **Cursor** (`~/.cursor/skills/`)
- **Gemini CLI** (`~/.gemini/skills/`)
- **Codex CLI** (`~/.codex/skills/`)
- **VS Code Copilot / Antigravity** (`~/.agents/skills/`)
- **Kiro** (`~/.kiro/skills/`)
- **OpenCode** (`~/.opencode/skills/`)
- **Pi** (`~/.pi/skills/`)
- **Trae International** (`~/.trae/skills/`)
- **Trae China** (`~/.trae-cn/skills/`)

## How It Works

All global skills now point to this local repository:

```
~/.claude/skills/polish → /Users/gqadonis/Projects/references/impeccable/.claude/skills/polish
```

This means:
- ✅ Changes to this repo are **immediately available** in all tools
- ✅ `git pull` updates propagate **instantly** everywhere
- ✅ Local edits can be tested **in real-time**

## Quick Commands

```bash
# Rebuild after source changes
bun run build

# Reinstall symlinks
bun run install-local

# Install specific providers only
bun run install-local -- --providers=claude,cursor

# Remove symlinks
bun run uninstall-local

# Clean build artifacts
bun run clean
```

## Development Workflow

### Making Changes

1. **Edit source files** in `source/skills/`
2. **Run build**: `bun run build`
3. **Test immediately** - changes are live!

### Getting Upstream Updates

```bash
git pull origin main
bun run build
# All tools now have latest skills
```

### Verifying Installation

```bash
# List symlinks
ls -la ~/.claude/skills/

# Check a specific skill
readlink ~/.claude/skills/polish
# Should show: /Users/gqadonis/Projects/references/impeccable/.claude/skills/polish
```

## Available Scripts

Added to `package.json`:

- `bun run install-local` - Build and install with symlinks
- `bun run uninstall-local` - Remove symlinks

## Documentation

- **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** - Complete development guide
- **[CLAUDE.md](./CLAUDE.md)** - Project instructions for Claude
- **[README.md](./README.md)** - Project overview

## Troubleshooting

### Skills not showing up

Restart your AI tool or reload shell configuration.

### Can't replace existing directory

If you get `⚠️ directory exists` warnings:

```bash
# Backup existing skills
mv ~/.claude/skills/polish ~/.claude/skills/polish.backup

# Reinstall
bun run install-local
```

### Changes not appearing

Make sure you ran `bun run build` after editing source files.

## What's Next

You can now:

1. Edit skills in `source/skills/` and rebuild to see changes everywhere
2. Pull upstream updates with `git pull` and rebuild to get latest features
3. Test local changes immediately in any AI tool
4. Contribute improvements back to the project

## Support

- GitHub: https://github.com/pbakaus/impeccable
- Website: https://impeccable.style
- Issues: https://github.com/pbakaus/impeccable/issues
