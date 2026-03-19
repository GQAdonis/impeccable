---
name: critique
description: Evaluate design effectiveness from a UX perspective. Assesses visual hierarchy, information architecture, emotional resonance, and overall design quality with actionable feedback. Use when the user wants a design review, UX feedback, asks to evaluate visual quality, or wants to check for AI-generated design tells.
user-invokable: true
args:
  - name: area
    description: The feature or area to critique (optional)
    required: false
---

## MANDATORY PREPARATION

Use the frontend-design skill -- it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding -- if no design context exists yet, you MUST run teach-impeccable first. Additionally gather: what the interface is trying to accomplish.

---

## AUTOMATED ANTI-PATTERN SCAN (First Pass)

Before the manual critique, run the bundled deterministic detector. It catches 25 specific issues (AI slop tells + general design quality).

```bash
node scripts/detect-antipatterns.mjs --json [--fast] [target]
```

- Pass files or directories as `[target]`
- For URLs, skip the CLI scan (it requires Puppeteer installation). Instead, rely on browser visualization (below) and LLM analysis.
- For large directories (200+ scannable files), use `--fast` (regex-only, skips jsdom)
- For 500+ files, narrow scope to the most relevant subdirectory or ask the user
- Exit code 0 = clean, 2 = findings

Include scan findings in the Anti-Patterns Verdict and Priority Issues. The detector is highly reliable but not perfect. If a finding is clearly a false positive given the context (e.g., intentional design choice), note it as such rather than blindly reporting it.

---

## BROWSER VISUALIZATION (When Available)

If you have browser automation tools that control a visual browser in front of the user (e.g., `mcp__claude-in-chrome__javascript_tool`, Cursor's browser), AND the target is a viewable page, enhance the critique with live visual overlays.

1. **Navigate** to the page (use dev server URL for local files, or direct URL)
2. **Inject** `scripts/detect-antipatterns-browser.js` via `javascript_tool`: read the file and pass its content as JS to evaluate. The IIFE auto-executes and shows pink/magenta outlines with labels on every issue. Do NOT `cat` the file into the conversation first.
3. **Reference** the overlays in your report: "As highlighted in the browser..."

For multi-view targets, inject on 3-5 representative pages. If injection fails, continue with CLI results only.

---

Think like a design director giving feedback. Evaluate whether the interface works as a designed experience.

## Design Critique

### AI Slop Detection (CRITICAL)

**This is the most important check.** Does this look like every other AI-generated interface? Review against ALL **DON'T** guidelines in the frontend-design skill. Check for AI color palette, gradient text, dark glows, glassmorphism, hero metric layouts, identical card grids, generic fonts, and all other tells.

**The test**: If someone said "AI made this," would you believe them immediately?

### Holistic Design Review

Evaluate: **visual hierarchy** (eye flow, primary action clarity), **information architecture** (structure, grouping, cognitive load), **emotional resonance** (does it match brand and audience?), **discoverability** (are interactive elements obvious?), **composition** (balance, whitespace, rhythm), **typography** (hierarchy, readability, font choices), **color** (purposeful use, cohesion, accessibility), **states & edge cases** (empty, loading, error, success), **microcopy** (clarity, tone, helpfulness).

## Generate Critique Report

Structure your feedback as a design director would:

### Anti-Patterns Verdict

**Start here.** Does this look AI-generated?

**Deterministic scan**: Summarize what the automated detector found, with counts and file locations.

**Visual overlays** (if browser was used): Reference what the user can see highlighted in their browser.

**LLM assessment**: Your own evaluation of AI slop tells beyond what the detector checks. The detector covers 25 specific patterns; your assessment should cover everything else: overall aesthetic feel, layout sameness, generic composition, missed opportunities for personality.

### Overall Impression
A brief gut reaction -- what works, what doesn't, and the single biggest opportunity.

### What's Working
Highlight 2-3 things done well. Be specific about why they work.

### Priority Issues
The 3-5 most impactful design problems, ordered by importance:

For each issue:
- **What**: Name the problem clearly
- **Why it matters**: How this hurts users or undermines goals
- **Fix**: What to do about it (be concrete)
- **Command**: Which command to use (prefer: /animate, /quieter, /optimize, /adapt, /clarify, /distill, /delight, /onboard, /normalize, /audit, /harden, /polish, /extract, /bolder, /arrange, /typeset, /critique, /colorize, /overdrive -- or other installed skills you're sure exist)

### Minor Observations
Quick notes on smaller issues worth addressing.

### Questions to Consider
Provocative questions that might unlock better solutions:
- "What if the primary action were more prominent?"
- "Does this need to feel this complex?"
- "What would a confident version of this look like?"

**Remember**:
- Be direct -- vague feedback wastes everyone's time
- Be specific -- "the submit button" not "some elements"
- Say what's wrong AND why it matters to users
- Give concrete suggestions, not just "consider exploring..."
- Prioritize ruthlessly -- if everything is important, nothing is
- Don't soften criticism -- developers need honest feedback to ship great design