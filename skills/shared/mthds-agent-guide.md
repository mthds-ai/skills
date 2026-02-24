# MTHDS Agent Guide

Strategy and reference for agents working with MTHDS methods programmatically.

## Agent CLI

Agents must use `mthds-agent` exclusively. It outputs structured JSON (stdout=success, stderr=error with exit code 1).

**Prerequisite**: See [CLI Prerequisites](prerequisites.md)

## Global Options

These options apply to **all** `mthds-agent` commands and must appear **before** the subcommand:

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--log-level` | `debug`, `info`, `warning`, `error`, `critical` | `warning` | Controls verbosity of diagnostic output on stderr |
| `--version` | — | — | Print version and exit |

Examples:
```bash
# Debug: additional context on what the CLI is doing
mthds-agent --log-level debug pipelex validate bundle.mthds -L dir/
```

When diagnosing failures, use `--log-level debug` to get additional context — internal resolution steps, model routing details, and validation traces.

## Building Methods

Use the /build skill for a guided 10-phase process: requirements → plan → concepts → structure → flow → review → pipes → assemble → validate → deliver. Refine with /edit and /fix if the result needs adjustments.

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
    │  mthds-agent pipelex │ err │  /fix skill  │
    │  validate file.mthds │     └──────────────┘
    └──────────┬───────────┘
               │ ok
               ▼
    ┌──────────────────────┐
    │  Run                 │
    │  mthds-agent pipelex │
    │  run file.mthds      │
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

All `mthds-agent` commands output JSON to **stdout** on success:

```json
{
  "success": true,
  "pipe_code": "my_pipe",
  ...command-specific fields...
}
```

### Error Handling

For all error types, recovery strategies, and error domains, see [Error Handling Reference](error-handling.md).

## Inline JSON for Inputs

The `--inputs` flag on `mthds-agent pipelex run` accepts **both** file paths and inline JSON. The CLI auto-detects: if the value starts with `{`, it is parsed as JSON directly.

```bash
# File path
mthds-agent pipelex run bundle.mthds --inputs inputs.json

# Inline JSON (no file creation needed)
mthds-agent pipelex run bundle.mthds --inputs '{"theme": {"concept": "native.Text", "content": {"text": "nature"}}}'
```

Inline JSON is the fastest path for agents — skip file creation for simple inputs.

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
mthds-agent pipelex validate mthds-wip/pipeline_01/bundle.mthds -L mthds-wip/pipeline_01/

# Run (directory mode: auto-detects bundle, inputs, and -L)
mthds-agent pipelex run mthds-wip/pipeline_01/
```

Without `-L` (or directory mode for `run`), commands will load all `.mthds` files in the default search paths, which can cause name collisions between bundles.

## Package Management

The `mthds` CLI includes `package` commands for managing MTHDS packages.

Use these commands to initialize packages, manage dependencies, lock/install, and validate manifests.

All `mthds package` commands accept `--directory <path>` (short: `-d`) to target a package directory other than CWD. This is essential when the agent's working directory differs from the package location:

```bash
mthds package init --directory mthds-wip/restaurant_presenter/
mthds package validate --directory mthds-wip/restaurant_presenter/
```

> **Note**: `mthds package validate` validates the `METHODS.toml` package manifest — not `.mthds` bundle semantics. For bundle validation, use `mthds-agent pipelex validate`.

## Generating Visualizations

Agents can generate execution graph visualizations for human review.

### Execution Graphs

Execution graph visualizations are generated by default with every `mthds-agent pipelex run` command. Use `--no-graph` to disable.

```bash
mthds-agent pipelex run <bundle-dir>/
```

The success JSON includes a `graph_files` field with the path to the graph HTML file. The filename reflects the run mode — `live_run.html` for full runs, `dry_run.html` for dry runs:
```json
{
  "success": true,
  "pipe_code": "main_pipe",
  "graph_files": {
    "graph_html": "<bundle-dir>/live_run.html"
  },
  ...
}
```

## Agent CLI Command Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `mthds-agent pipelex run` | Execute a pipeline | `mthds-agent pipelex run <bundle-dir>/` |
| `mthds-agent pipelex validate` | Validate a bundle or pipe | `mthds-agent pipelex validate bundle.mthds` |
| `mthds-agent pipelex inputs` | Generate example input JSON | `mthds-agent pipelex inputs bundle.mthds` |
| `mthds-agent pipelex concept` | Structure a concept from JSON spec | `mthds-agent pipelex concept --spec '{...}'` |
| `mthds-agent pipelex pipe` | Structure a pipe from JSON spec | `mthds-agent pipelex pipe --spec '{"type": "PipeLLM", ...}'` |
| `mthds-agent pipelex assemble` | Assemble a .mthds bundle from parts | `mthds-agent pipelex assemble --domain my_domain ...` |
| `mthds-agent pipelex models` | List available model presets and talent mappings | `mthds-agent pipelex models` / `mthds-agent pipelex models -t llm -b anthropic` |
| `mthds-agent pipelex doctor` | Check config health and auto-fix | `mthds-agent pipelex doctor` |
| `mthds package init` | Initialize METHODS.toml | `mthds package init -d <pkg-dir>` |
| `mthds package list` | Display package manifest | `mthds package list -d <pkg-dir>` |
| `mthds package add` | Add a dependency | `mthds package add github.com/org/repo -d <pkg-dir>` |
| `mthds package lock` | Resolve deps and generate lockfile | `mthds package lock -d <pkg-dir>` |
| `mthds package install` | Install from lockfile | `mthds package install -d <pkg-dir>` |
| `mthds package update` | Re-resolve and update lockfile | `mthds package update -d <pkg-dir>` |
| `mthds package validate` | Validate METHODS.toml package manifest | `mthds package validate --all -r pipelex -d <pkg-dir>` |

> **Note**: All commands accept the `--log-level` global option before the subcommand (see [Global Options](#global-options)).
