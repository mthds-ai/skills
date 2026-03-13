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
│   ├── mthds-build/                  # /build — create new .mthds bundles from scratch
│   │   └── references/              # Skill-specific refs (manual-build-phases, talents-and-presets)
│   ├── mthds-check/                  # /check — validate bundles (read-only)
│   ├── mthds-edit/                   # /edit — modify existing bundles
│   │   └── references/              # Skill-specific refs (talents-and-presets)
│   ├── mthds-explain/                # /explain — document and explain workflows
│   ├── mthds-fix/                    # /fix — auto-fix validation errors
│   ├── mthds-inputs/                 # /inputs — prepare inputs (templates, synthetic data)
│   ├── mthds-install/                # /install — install method packages
│   ├── mthds-pkg/                    # /pkg — MTHDS package management (init, deps, lock)
│   ├── mthds-run/                    # /run — execute methods and interpret output
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
make check       # Verify shared refs, shared files, and version consistency
make test        # Run unit tests (sets up venv via uv)
make env         # Create virtual environment
make install     # Install dev dependencies
```

**`make check`** runs `scripts/check.py` (no venv needed — uses system `python3`) and verifies that:
1. No SKILL.md files contain stale `references/` paths to shared files (should use `../shared/` instead).
2. All 4 shared files exist in `skills/shared/`.
3. All `min_mthds_version` frontmatter values in SKILL.md files match the canonical version in `mthds-agent-guide.md`.
4. All body-text version references in Step 0 sections match the canonical version.

**`make test`** runs pytest against `tests/` using a uv-managed venv.

## PostToolUse Hook

`hooks/validate-mthds.sh` runs automatically after every Write or Edit on `.mthds` files. It:
1. Lints with `mthds-agent plxt lint` (blocks on errors)
2. Formats with `mthds-agent plxt fmt` (only if lint passes)
3. Validates semantically with `mthds-agent pipelex validate bundle` (blocks or warns)

Passes silently if `mthds-agent` is not installed or file is not `.mthds`.

## Prerequisites

The `mthds-agent` CLI must be on PATH. Install via: `npm install -g mthds`

## Key Dependency

This plugin calls `mthds-agent` (from the `mthds-js` repo). Changes to the `mthds-agent` CLI interface can break the hook and skill docs.
