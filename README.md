# MTHDS Skills

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills plugin for building, running, validating, and editing AI methods (.mthds bundle files) using the `mthds-agent` CLI.

[MTHDS](https://mthds.ai) is an open standard for AI methods. Find methods on the hub: [MTHDS Hub](https://mthds.sh). Install the reference python runtime from [Pipelex](https://github.com/Pipelex/pipelex).

## Skills

| Skill&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description |
|:------|:------------|
| `/mthds-build` | Build new AI method bundles from scratch. Supports both automated CLI build and guided 10-phase manual construction. |
| `/mthds-check` | Validate workflow bundles for issues. Reports problems without modifying files (read-only analysis). |
| `/mthds-edit` | Modify existing workflow bundles — change pipes, update prompts, rename concepts, add or remove steps. |
| `/mthds-explain` | Explain and document existing workflows. Walk through the execution flow in plain language. |
| `/mthds-fix` | Automatically fix validation errors in workflow bundles. Applies fixes and re-validates in a loop. |
| `/mthds-run` | Execute MTHDS methods and interpret their JSON output. Supports dry runs, mock inputs, and graph generation. |
| `/mthds-inputs` | Prepare inputs for workflows: placeholder templates, synthetic test data, user-provided files, or a mix. |
| `/mthds-install` | Install method packages from GitHub or local directories. |
| `/mthds-pkg` | Manage MTHDS packages — initialize, add dependencies, lock, install, update, and validate. |
| `/mthds-publish` | Publish methods to mthds.sh (telemetry only, no file writes). |
| `/mthds-share` | Share methods on social media (X, Reddit, LinkedIn). Pick specific platforms with `--platform`. |


## Installation in Claude Code

Install the `mthds` npm package:

```bash
npm install -g mthds
```

Start Claude Code:
```bash
claude
```

Tell Claude to install the MTHDS skills marketplace:
```bash
/plugin marketplace add mthds-ai/skills
```

then install the MTHDS skills plugin:
```bash
/plugin install mthds@mthds-ai-skills
```

then you must exit Claude Code and reopen it.
```bash
/exit
```

## Usage

To use a skill, type `/mthds-<skill-name>` in Claude Code. For example: `/mthds-build`, `/mthds-run`, `/mthds-check`.

## Project Structure

```
skills/
├── mthds-build/        # Build skill + reference docs
│   └── references/     # Manual build phases, talent/preset mappings
├── mthds-check/        # Validate workflows
├── mthds-edit/         # Edit workflows
├── mthds-explain/      # Explain workflows
├── mthds-fix/          # Fix validation errors
├── mthds-run/          # Run pipelines
├── mthds-inputs/       # Prepare inputs (template, synthetic, user data)
├── mthds-install/      # Install method packages
├── mthds-pkg/          # Package management
├── mthds-publish/      # Publish methods to mthds.sh
├── mthds-share/        # Share methods on social media
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
