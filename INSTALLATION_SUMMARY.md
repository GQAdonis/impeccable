# Impeccable - Local Installation Summary

## ✅ Installation Complete!

Your local development environment has been successfully configured with symbolic links to this repository.

## What was installed

**Centralized Location:** `~/.TOOLS/skills/`

This installation creates a centralized directory structure where all AI tool skills are managed from a single location. Both impeccable skills and third-party skills can coexist in the same directory.

**Architecture:**
- Skills are built to local `./{provider}/skills/` directories
- Individual skills symlink to `~/.TOOLS/skills/{provider}/`
- Legacy paths (`~/.claude/skills/`) symlink to centralized directories

**Total:** 21 skills across 10 AI tool providers

## How symlinks work

**Two-level symlink architecture:**

1. **Individual skill symlinks:**
   ```
   ~/.TOOLS/skills/claude/polish/ → ./impeccable/.claude/skills/polish/
   ```

2. **Provider-level symlinks:**
   ```
   ~/.claude/skills/ → ~/.TOOLS/skills/claude/
   ```

**Example resolution:**
- Claude Code reads: `~/.claude/skills/polish/skill.md`
- Resolves to: `~/.TOOLS/skills/claude/polish/skill.md`
- Resolves to: `./impeccable/.claude/skills/polish/skill.md`

This indirection is transparent to AI tools - they see a normal directory structure.

## Essential Commands

```bash
# Validate installation health
bun run validate-local

# Rebuild after source changes
bun run build

# Get upstream updates
git pull && bun run build

# Add custom skills
ln -s /path/to/my-skill ~/.TOOLS/skills/claude/my-skill

# List all skills
ls -la ~/.TOOLS/skills/claude/

# Check symlink targets
readlink ~/.claude/skills                    # Provider-level
readlink ~/.TOOLS/skills/claude/polish       # Skill-level

# Uninstall
bun run uninstall-local
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
# Should show: ~/.TOOLS/skills/claude/polish
```

## Troubleshooting

**Installation validation fails:**
```bash
# Check specific issues
bun run validate-local

# Fix broken symlinks
bun run build && bun run install-local

# Fix stale builds
bun run build
```

**Skills not visible in AI tool:**
```bash
# Verify symlink structure
readlink ~/.claude/skills
ls -la ~/.TOOLS/skills/claude/

# Restart AI tool or reload configuration
```

**Restore from backup:**
```bash
# Find backup
ls ~/.claude/ | grep backup

# Restore specific skill
mv ~/.claude/skills.backup-*/my-skill ~/.TOOLS/skills/claude/
```

**Complete reinstall:**
```bash
bun run uninstall-local
bun run install-local
bun run validate-local
```

## Available Scripts

Added to `package.json`:

- `bun run install-local` - Build and install with symlinks
- `bun run uninstall-local` - Remove symlinks

## Documentation

- **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** - Complete development guide
- **[CLAUDE.md](./CLAUDE.md)** - Project instructions for Claude
- **[README.md](./README.md)** - Project overview

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