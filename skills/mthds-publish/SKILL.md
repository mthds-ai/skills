---
name: mthds-publish
min_mthds_version: 0.1.2
description: Publish MTHDS methods to mthds.sh. Use when user says "publish this method", "publish to mthds", "publish my methods", "mthds publish", "register my method", or wants to publish a method package to the mthds.sh hub.
---

# Publish MTHDS methods to mthds.sh

Publish method packages to mthds.sh (telemetry tracking). No files are written, no runner is installed — this only registers the method on the hub.

## Process

### Step 0 — CLI Check (mandatory, do this FIRST)

Run `mthds-agent --version`. The minimum required version is **0.1.0** (declared in this skill's front matter as `min_mthds_version`).

- **If the command is not found**: STOP. Do not proceed. Tell the user:

> The `mthds-agent` CLI is required but not installed. Install it with:
>
> ```
> npm install -g mthds
> ```
>
> Then re-run this skill.

- **If the version is below 0.1.0**: STOP. Do not proceed. Tell the user:

> This skill requires `mthds-agent` version 0.1.0 or higher (found *X.Y.Z*). Upgrade with:
>
> ```
> npm install -g mthds@latest
> ```
>
> Then re-run this skill.

- **If the version is 0.1.0 or higher**: proceed to the next step.

### Step 1: Identify the Source

Determine where the method package lives:

| Source | Syntax | Example |
|--------|--------|---------|
| GitHub (short) | `org/repo` | `mthds-ai/contract-analysis` |
| GitHub (full URL) | `https://github.com/org/repo` | `https://github.com/mthds-ai/contract-analysis` |
| Local directory | `--local <path>` | `--local ./my-methods/` |

### Step 2: Run the Publish Command

**From GitHub**:

```bash
mthds-agent publish <org/repo>
```

**From a local directory**:

```bash
mthds-agent publish --local <path>
```

**Publish a specific method from a multi-method package**:

```bash
mthds-agent publish <org/repo> --method <name>
```

| Flag | Required | Values | Description |
|------|----------|--------|-------------|
| `[address]` | Yes* | `org/repo` | GitHub repo address |
| `--local <path>` | Yes* | directory path | Publish from a local directory |
| `--method <name>` | No | method name | Publish only one method from a multi-method package |

*One of `address` or `--local` is required.

### Step 3: Parse the Output

On success, the CLI returns JSON:

```json
{
  "success": true,
  "published_methods": ["method-name"],
  "address": "org/repo"
}
```

Present to the user:
- Which methods were published
- The address on mthds.sh

### Step 4: Offer to Share

After a successful publish, ask the user if they want to share their methods on social media. If yes, use the `/mthds-share` skill or run `mthds-agent share` directly.

### Step 5: Handle Errors

Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to resolve methods` | GitHub repo not found or no methods in repo | Verify the address and that the repo contains METHODS.toml |
| `Method "X" not found` | `--method` filter doesn't match any method | Check available method names in the package |
| `No valid methods to publish` | No methods passed validation | Check METHODS.toml in the package |

For all error types and recovery strategies, see [Error Handling Reference](../shared/error-handling.md).

## Reference

- [Error Handling](../shared/error-handling.md) — read when CLI returns an error to determine recovery
- [MTHDS Agent Guide](../shared/mthds-agent-guide.md) — read for CLI command syntax or output format details
