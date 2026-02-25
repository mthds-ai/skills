# MTHDS Skills

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills plugin for building, running, validating, and editing AI methods (.mthds bundle files) using the `mthds-agent` CLI.

## Skills

| Skill | Description |
|-------|-------------|
| `/build` | Build new AI method bundles from scratch. Supports both automated CLI build and guided 10-phase manual construction. |
| `/check` | Validate workflow bundles for issues. Reports problems without modifying files (read-only analysis). |
| `/edit` | Modify existing workflow bundles — change pipes, update prompts, rename concepts, add or remove steps. |
| `/explain` | Explain and document existing workflows. Walk through the execution flow in plain language. |
| `/fix` | Automatically fix validation errors in workflow bundles. Applies fixes and re-validates in a loop. |
| `/run` | Execute MTHDS methods and interpret their JSON output. Supports dry runs, mock inputs, and graph generation. |
| `/inputs` | Prepare inputs for workflows: placeholder templates, synthetic test data, user-provided files, or a mix. |
| `/pkg` | Manage MTHDS packages — initialize, add dependencies, lock, install, update, and validate. |

## Installation

```bash
claude install-skill https://github.com/mthds-ai/skills
```

## Prerequisites

The `mthds-agent` CLI must be available in your environment:

```bash
mthds-agent --version
```

If not installed, install the `mthds` npm package: `npm install -g mthds`. For details, see [prerequisites](skills/shared/prerequisites.md).

## Project Structure

```
skills/
├── build/              # Build skill + reference docs
│   └── references/     # Manual build phases, talent/preset mappings
├── check/              # Validate workflows
├── edit/               # Edit workflows
├── explain/            # Explain workflows
├── fix/                # Fix validation errors
├── run/                # Run pipelines
├── inputs/             # Prepare inputs (template, synthetic, user data)
├── pkg/                # Package management
└── shared/             # Shared references across all skills
    ├── prerequisites.md
    ├── error-handling.md
    ├── mthds-agent-guide.md
    └── mthds-reference.md
```

## License

[MIT](LICENSE) — Copyright (c) 2026 Evotis S.A.S.

Maintained by [Pipelex](https://pipelex.com).
"Pipelex" is a trademark of Evotis S.A.S.
