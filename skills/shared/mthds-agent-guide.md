# MTHDS Agent Guide

All skills in this plugin require `mthds-agent >= 0.0.13`. The Step 0 CLI Check in each skill enforces this — parse the output of `mthds-agent --version` and block execution if the version is below `0.0.13`.

## IMPORTANT PREREQUISITES

Before working, or if there is any doubt about the CLI, check the following in order:

### 1. Check if `mthds` is installed

```bash
mthds --version
```

If it fails, ASK the user if they want to install it. If YES, run `npm install -g mthds`.

### 2. Check if the `pipelex` runtime is installed

To RUN methods, the user needs the `pipelex` runtime. ASK the user if they want to install it. If YES:

```bash
mthds-agent runner setup pipelex
```

This installs the pipelex binary. It does NOT configure anything.

### 3. Initialize pipelex configuration

After pipelex is installed, it needs to be configured. **You MUST ask the user ALL of the following questions BEFORE running any init command. Do NOT run the CLI until you have all answers.**

**Question 1 — Backends:** Ask the user which AI backends they want to enable. Examples: `openai`, `anthropic`, `pipelex_gateway`. Run `mthds-agent pipelex init --help` to discover all available options.

**Question 2 — Gateway terms (only if `pipelex_gateway` was chosen):** Ask the user: "Do you accept the Pipelex Gateway Terms of Service and Privacy Policy? See: https://www.pipelex.com/privacy-policy". Only set `"accept_gateway_terms": true` if the user explicitly says yes. If they decline, remove `pipelex_gateway` from the backends list.

**Question 3 — Telemetry:** Ask the user: "Do you want anonymous telemetry enabled?" Options: `"off"` (no telemetry) or `"anonymous"` (anonymous usage data).

**Only after collecting all answers**, build the JSON config and run:

```bash
# Example without pipelex_gateway:
mthds-agent pipelex init -g --config '{"backends": ["openai"], "telemetry_mode": "off"}'

# Example with pipelex_gateway (user accepted terms):
mthds-agent pipelex init -g --config '{"backends": ["pipelex_gateway", "openai"], "accept_gateway_terms": true, "telemetry_mode": "anonymous"}'
```

- `-g` targets the global `~/.pipelex/` directory. Without it, targets project-level `.pipelex/` (requires a project root).
- Config JSON schema: `{"backends": list[str], "primary_backend": str, "accept_gateway_terms": bool, "telemetry_mode": str}`. All fields optional.
- When `pipelex_gateway` is in backends, `accept_gateway_terms` must be set.
- When 2+ backends are selected without `pipelex_gateway`, `primary_backend` is required.

FROM NOW ON, ASSUME THE CLI IS INSTALLED AND WORKING, and ONLY USE `mthds-agent` commands.

## Agent CLI

Agents must use `mthds-agent` exclusively. It outputs structured JSON (stdout=success, stderr=error with exit code 1).

## Global Options

These options apply to **all** `mthds-agent` commands and must appear **before** the subcommand:

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--log-level` | `debug`, `info`, `warning`, `error`, `critical` | `warning` | Controls verbosity of diagnostic output on stderr |
| `--version` | — | — | Print version and exit |

Examples:
```bash
# Debug: additional context on what the CLI is doing
mthds-agent --log-level debug pipelex validate pipe bundle.mthds -L dir/
```

When diagnosing failures, use `--log-level debug` to get additional context — internal resolution steps, model routing details, and validation traces.

## Building Methods

Use the /mthds-build skill for a guided 10-phase process: requirements → plan → concepts → structure → flow → review → pipes → assemble → validate → deliver. Refine with /mthds-edit and /mthds-fix if the result needs adjustments.

## The Iterative Development Loop

```
                 ┌─────────────────────────────────────┐
                 │                                     │
                 ▼                                     │
    ┌──────────────────────┐                           │
    │  Build or Edit       │                           │
    │  (.mthds file)       │                           │
    └──────────┬───────────┘                           │
               │                                       │
               ▼                                       │
    ┌──────────────────────┐     ┌──────────────┐      │
    │  Validate            │────►│  Fix errors  │──────┘
    │  mthds-agent pipelex │ err │  /mthds-fix  │
    │  validate file.mthds │     └──────────────┘
    └──────────┬───────────┘
               │ ok
               ▼
    ┌──────────────────────┐
    │  Run                 │
    │  mthds-agent pipelex │
    │  run pipe file.mthds │
    └──────────┬───────────┘
              │
              ▼
    ┌────────────────────┐
    │  Inspect output    │
    │  Refine if needed  │──────────────────────────►(loop back to Edit)
    └────────────────────┘
```

## Understanding JSON Output

### Success Format

The `mthds-agent pipelex run pipe` command has two output modes:

**Compact (default)**: The concept's structured JSON is emitted directly — no envelope, no metadata:

```json
{
  "clauses": [
    { "title": "Non-Compete", "risk_level": "high" },
    { "title": "Termination", "risk_level": "medium" }
  ],
  "overall_risk": "high"
}
```

This works directly with `jq` and other JSON tools.

**With memory (`--with-memory`)**: The full working memory envelope for piping to another method:

```json
{
  "main_stuff": {
    "json": "<concept as JSON string>",
    "markdown": "<concept as Markdown string>",
    "html": "<concept as HTML string>"
  },
  "working_memory": {
    "root": { ... },
    "aliases": { ... }
  }
}
```

Other `mthds-agent` commands (validate, inputs, etc.) continue to output their existing JSON format with `"success": true`.

### Error Handling

For all error types, recovery strategies, and error domains, see [Error Handling Reference](error-handling.md).

## Inputs

### `--inputs` Flag

The `--inputs` flag on `mthds-agent pipelex run pipe` accepts **both** file paths and inline JSON. The CLI auto-detects: if the value starts with `{`, it is parsed as JSON directly.

```bash
# File path
mthds-agent pipelex run pipe bundle.mthds --inputs inputs.json

# Inline JSON (no file creation needed)
mthds-agent pipelex run pipe bundle.mthds --inputs '{"theme": {"concept": "native.Text", "content": {"text": "nature"}}}'
```

Inline JSON is the fastest path for agents — skip file creation for simple inputs.

### stdin (Piped Input)

When `--inputs` is not provided and stdin is not a TTY (i.e., data is piped), JSON is read from stdin:

```bash
echo '{"text": {"concept": "native.Text", "content": {"text": "hello"}}}' | mthds-agent pipelex run pipe <bundle-dir>/
```

**`--inputs` always takes priority** over stdin. If both are present, stdin is ignored.

When stdin contains a `working_memory` key (from upstream `--with-memory` output), the runtime automatically extracts stuffs from the working memory and resolves them as inputs.

## Piping Methods

Methods can be chained via Unix pipes using `--with-memory` to pass the full working memory between steps:

```bash
mthds-agent pipelex run method extract-terms --inputs data.json --with-memory \
  | mthds-agent pipelex run method assess-risk --with-memory \
  | mthds-agent pipelex run method generate-report
```

When methods are installed as CLI shims, the same chain is:

```bash
extract-terms --inputs data.json --with-memory \
  | assess-risk --with-memory \
  | generate-report
```

- **`--with-memory`** on intermediate steps emits the full envelope (`main_stuff` + `working_memory`).
- The **final step** omits `--with-memory` to produce compact output (concept JSON only).
- **Name matching**: upstream stuff names are matched against downstream input names. Method authors should name their outputs to match downstream expectations.

## Working Directory Convention

All generated files go into `mthds-wip/`, organized per pipeline:

```
mthds-wip/
  pipeline_01/              # Automated build output
    bundle.mthds
    inputs.json             # Input template
    inputs/                 # Synthesized input files
      test_input.json
    test-files/             # Generated test files (images, PDFs)
      photo.jpg
    dry_run.html            # Execution graph from dry run
    live_run.html           # Execution graph from full run
  pipeline_02/
    bundle.mthds
    ...
```

## Library Isolation

Pipelex loads `.mthds` files into a flat namespace. When multiple bundles exist in the project, pipe codes can collide. Use **directory mode** for `run` to auto-detect the bundle, inputs, and library dir, or pass `-L` explicitly for other commands:

```bash
# Validate (isolated)
mthds-agent pipelex validate pipe mthds-wip/pipeline_01/bundle.mthds -L mthds-wip/pipeline_01/

# Run (directory mode: auto-detects bundle, inputs, and -L)
mthds-agent pipelex run pipe mthds-wip/pipeline_01/
```

Without `-L` (or directory mode for `run`), commands will load all `.mthds` files in the default search paths, which can cause name collisions between bundles.

## Package Management

The `mthds-agent package` commands manage MTHDS package manifests (`METHODS.toml`).

Use these commands to initialize packages, list manifests, and validate them.

All `mthds-agent package` commands accept `-C <path>` (long: `--package-dir`) to target a package directory other than CWD. This is essential when the agent's working directory differs from the package location:

```bash
mthds-agent package init --address github.com/org/repo --version 1.0.0 --description "My package" -C mthds-wip/restaurant_presenter/
mthds-agent package validate -C mthds-wip/restaurant_presenter/
```

> **Note**: `mthds-agent package validate` validates the `METHODS.toml` package manifest — not `.mthds` bundle semantics. For bundle validation, use `mthds-agent pipelex validate pipe`.

## Generating Visualizations

Agents can generate execution graph visualizations for human review.

### Execution Graphs

Execution graph visualizations are generated by default with every `mthds-agent pipelex run pipe` command. Use `--no-graph` to disable.

```bash
mthds-agent pipelex run pipe <bundle-dir>/
```

Graph files (`live_run.html` / `dry_run.html`) are written to disk next to the bundle. Their paths appear in runtime logs on stderr, not in compact stdout. When using `--with-memory`, `graph_files` is included in the returned JSON envelope.

## Agent CLI Command Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `mthds-agent runner setup pipelex` | Install the pipelex runtime (does not configure) | `mthds-agent runner setup pipelex` |
| `mthds-agent runner setup api` | Set up the API runner credentials | `mthds-agent runner setup api --api-key sk-...` |
| `mthds-agent pipelex init` | Initialize pipelex configuration (non-interactive) | `mthds-agent pipelex init -g --config '{"backends": ["openai"]}'` |
| `mthds-agent pipelex run pipe` | Execute a pipeline (compact output by default; use `--with-memory` for full envelope) | `mthds-agent pipelex run pipe <bundle-dir>/` |
| `mthds-agent pipelex validate pipe` | Validate a bundle or pipe | `mthds-agent pipelex validate pipe bundle.mthds` |
| `mthds-agent pipelex inputs pipe` | Generate example input JSON | `mthds-agent pipelex inputs pipe bundle.mthds` |
| `mthds-agent pipelex concept` | Structure a concept from JSON spec | `mthds-agent pipelex concept --spec '{...}'` |
| `mthds-agent pipelex pipe` | Structure a pipe from JSON spec | `mthds-agent pipelex pipe --spec '{"type": "PipeLLM", ...}'` |
| `mthds-agent pipelex assemble` | Assemble a .mthds bundle from parts | `mthds-agent pipelex assemble --domain my_domain ...` |
| `mthds-agent pipelex models` | List available model presets and talent mappings | `mthds-agent pipelex models` / `mthds-agent pipelex models -t llm -b anthropic` |
| `mthds-agent pipelex doctor` | Check config health and auto-fix | `mthds-agent pipelex doctor` |
| `mthds-agent install` | Install a method package from GitHub or local directory | `mthds-agent install org/repo --agent claude-code --location local` |
| `mthds-agent package init` | Initialize METHODS.toml | `mthds-agent package init --address github.com/org/repo --version 1.0.0 --description "desc" -C <pkg-dir>` |
| `mthds-agent package list` | Display package manifest | `mthds-agent package list -C <pkg-dir>` |
| `mthds-agent package validate` | Validate METHODS.toml package manifest | `mthds-agent package validate -C <pkg-dir>` |

> **Note**: All commands accept the `--log-level` global option before the subcommand (see [Global Options](#global-options)).
