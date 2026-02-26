# CLAUDE.md — skills

Claude Code skills plugin for building, running, validating, and editing AI methods (.mthds bundles) using the `mthds-agent` CLI.

## Repository Structure

```
skills/
├── .claude-plugin/marketplace.json   # Plugin metadata (name, version, skill list)
├── hooks/
│   ├── hooks.json                    # PostToolUse hook config (fires on Write|Edit)
│   └── validate-mthds.sh            # Lint → format → validate .mthds files via mthds-agent
├── skills/
│   ├── build/                        # /build — create new .mthds bundles from scratch
│   │   └── references/              # Skill-specific refs (manual-build-phases, talents-and-presets)
│   ├── check/                        # /check — validate bundles (read-only)
│   ├── edit/                         # /edit — modify existing bundles
│   │   └── references/              # Skill-specific refs (talents-and-presets)
│   ├── explain/                      # /explain — document and explain workflows
│   ├── fix/                          # /fix — auto-fix validation errors
│   ├── inputs/                       # /inputs — prepare inputs (templates, synthetic data)
│   ├── install/                      # /install — install method packages
│   ├── pkg/                          # /pkg — MTHDS package management (init, deps, lock)
│   ├── run/                          # /run — execute methods and interpret output
│   └── shared/                       # Shared reference docs (linked via ../shared/ from SKILL.md)
│       ├── error-handling.md
│       ├── mthds-agent-guide.md
│       ├── mthds-reference.md
│       └── native-content-types.md
├── Makefile
└── README.md
```

Each skill directory contains a `SKILL.md`. Shared reference docs live in `skills/shared/` and are linked from SKILL.md files via `../shared/` relative paths. Some skills (build, edit) also have a `references/` folder for skill-specific docs.

## Make Targets

```bash
make help        # Show available targets
make check       # Verify shared refs use ../shared/ paths and all shared files exist
```

**`make check`** verifies that:
1. No SKILL.md files contain stale `references/` paths to shared files (should use `../shared/` instead).
2. All 4 shared files exist in `skills/shared/`.

## PostToolUse Hook

`hooks/validate-mthds.sh` runs automatically after every Write or Edit on `.mthds` files. It:
1. Lints with `mthds-agent plxt lint` (blocks on errors)
2. Formats with `mthds-agent plxt fmt` (only if lint passes)
3. Validates semantically with `mthds-agent pipelex validate pipe` (blocks or warns)

Passes silently if `mthds-agent` is not installed or file is not `.mthds`.

## Prerequisites

The `mthds-agent` CLI must be on PATH. Install via: `npm install -g mthds`

## Key Dependency

This plugin calls `mthds-agent` (from the `mthds-js` repo). Changes to the `mthds-agent` CLI interface can break the hook and skill docs.
