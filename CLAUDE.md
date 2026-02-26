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
│   ├── check/                        # /check — validate bundles (read-only)
│   ├── edit/                         # /edit — modify existing bundles
│   ├── explain/                      # /explain — document and explain workflows
│   ├── fix/                          # /fix — auto-fix validation errors
│   ├── inputs/                       # /inputs — prepare inputs (templates, synthetic data)
│   ├── install/                      # /install — install method packages
│   ├── pkg/                          # /pkg — MTHDS package management (init, deps, lock)
│   ├── run/                          # /run — execute methods and interpret output
│   └── shared/                       # Canonical shared reference docs
│       ├── error-handling.md
│       ├── mthds-agent-guide.md
│       ├── mthds-reference.md
│       └── native-content-types.md
├── Makefile
└── README.md
```

Each skill directory contains a `SKILL.md` and a `references/` folder with inlined copies of shared docs.

## Make Targets

```bash
make help        # Show available targets
make sync        # Copy shared/ originals into each skill's references/ directory
make check       # Verify no stale cross-skill refs and all copies match shared/ originals
make clean-refs  # Remove all synced files from references/ directories
```

**`make sync`** is the primary maintenance command. After editing any file in `skills/shared/`, run `make sync` to propagate changes to all skill `references/` dirs.

**`make check`** does two things:
1. Greps all `SKILL.md` files for stale `../shared/` or `../build/` path references (should be zero).
2. Diffs every synced copy against its canonical source in `shared/`. Fails if any differ — fix with `make sync`.

## Shared Reference Distribution

Not all skills get every shared file:

| Shared file                | Skills that receive it |
|----------------------------|----------------------|
| `error-handling.md`        | All 9 skills |
| `mthds-agent-guide.md`    | All 9 skills |
| `mthds-reference.md`      | build, check, edit, explain, fix, inputs, run (not pkg, not install) |
| `native-content-types.md` | build, check, edit, explain, fix, inputs, run (not pkg, not install) |

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
