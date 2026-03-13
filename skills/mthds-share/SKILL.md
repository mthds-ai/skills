---
name: mthds-share
min_mthds_version: 0.1.2
description: Share MTHDS methods on social media (X/Twitter, Reddit, LinkedIn). Use when user says "share this method", "post on social media", "share on X", "share on Reddit", "share on LinkedIn", "tweet about this method", or wants to share a published method on social platforms.
---

# Share MTHDS methods on social media

Generate share URLs for method packages and open them in the browser. Supports X (Twitter), Reddit, and LinkedIn.

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

### Step 1: Ask the User

Before sharing, **ask the user**:

1. Which method(s) to share (address or local path)
2. Which platforms they want to share on: **X (Twitter)**, **Reddit**, **LinkedIn** — or all of them

Do NOT share automatically. Always confirm the platforms with the user first.

### Step 2: Run the Share Command

**Get share URLs for all platforms** (default):

```bash
mthds-agent share <org/repo>
```

**Get share URLs for specific platforms** (use `--platform` once per platform):

```bash
mthds-agent share <org/repo> --platform x
mthds-agent share <org/repo> --platform x --platform linkedin
mthds-agent share <org/repo> --platform reddit --platform linkedin
```

**Share a specific method from a multi-method package**:

```bash
mthds-agent share <org/repo> --method <name> --platform x
```

**Share from a local directory**:

```bash
mthds-agent share --local <path> --platform x --platform reddit
```

| Flag | Required | Values | Description |
|------|----------|--------|-------------|
| `[address]` | Yes* | `org/repo` | GitHub repo address |
| `--local <path>` | Yes* | directory path | Share from a local directory |
| `--method <name>` | No | method name | Share only one method from a multi-method package |
| `--platform <name>` | No | `x`, `reddit`, `linkedin` | Platform to share on. Repeat for multiple. Defaults to all |

*One of `address` or `--local` is required.

### Step 3: Parse the Output

On success, the CLI returns JSON:

```json
{
  "success": true,
  "methods": ["method-name"],
  "address": "org/repo",
  "share_urls": {
    "x": "https://twitter.com/intent/tweet?text=...",
    "reddit": "https://www.reddit.com/submit?type=TEXT&title=...&text=...",
    "linkedin": "https://www.linkedin.com/feed/?shareActive=true&text=..."
  }
}
```

Only the platforms requested via `--platform` will appear in `share_urls`. If no `--platform` is specified, all three are returned.

### Step 4: Open in Browser

After getting the URLs, open each one in the user's browser. Use the platform-appropriate command:

```bash
open "<url>"       # macOS
xdg-open "<url>"   # Linux
start "<url>"      # Windows
```

Tell the user which browser tabs were opened.

### Step 5: Handle Errors

Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid platform` | `--platform` value is not `x`, `reddit`, or `linkedin` | Use valid platform names |
| `Failed to resolve methods` | GitHub repo not found or no methods in repo | Verify the address |
| `Method "X" not found` | `--method` filter doesn't match any method | Check available method names |

For all error types and recovery strategies, see [Error Handling Reference](../shared/error-handling.md).

## Reference

- [Error Handling](../shared/error-handling.md) — read when CLI returns an error to determine recovery
- [MTHDS Agent Guide](../shared/mthds-agent-guide.md) — read for CLI command syntax or output format details
