---
name: mthds-share
min_mthds_version: 0.1.0
description: Publish a method to mthds.sh and share it on social media. Use when user says "share this method", "publish on mthds.sh", "post on social media", "share on X", "tweet about this method", or wants to publish and share an MTHDS method.
---

# Publish & Share MTHDS Methods

Publish a method package to mthds.sh (PostHog tracking) and optionally share it on X/Twitter.

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

- **If the version is below 0.1.0**: STOP. Do not proceed. Tell the user to upgrade.

- **If the version is 0.1.0 or higher**: proceed to the next step.

### Step 1: Identify the Source

Determine where the method package lives:

| Source | Syntax | Example |
|--------|--------|---------|
| GitHub (short) | `org/repo` | `mthds-ai/contract-analysis` |
| GitHub (full URL) | `https://github.com/org/repo` | `https://github.com/mthds-ai/contract-analysis` |
| Local directory | `--local <path>` | `--local ./my-methods/` |

### Step 2: Publish

Run the publish command with `--share` to get the share URL:

**From GitHub**:

```bash
mthds-agent publish <org/repo> --share
```

**From a local directory**:

```bash
mthds-agent publish --local <path> --share
```

**Publish a specific method**:

```bash
mthds-agent publish <org/repo> --method <name> --share
```

### Step 3: Parse Output

On success, the CLI returns JSON:

```json
{
  "success": true,
  "published_methods": ["method-name"],
  "address": "org/repo",
  "share_urls": {
    "x": "https://twitter.com/intent/tweet?text=...",
    "reddit": "https://www.reddit.com/submit?title=...&url=...",
    "linkedin": "https://www.linkedin.com/sharing/share-offsite/?url=..."
  }
}
```

### Step 4: Share on Social Media

If the output includes `share_urls`, ask the user which platform they want to share on (X, Reddit, LinkedIn), then open the corresponding URL in the browser:

```bash
open "<share_urls.x>"       # X/Twitter
open "<share_urls.reddit>"  # Reddit
open "<share_urls.linkedin>" # LinkedIn
```

### Step 5: Present Results

Tell the user:
- Which methods were published
- Whether the browser was opened for sharing
- The share URL (in case they want to share manually)

### Step 6: Handle Errors

Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to resolve methods` | GitHub repo not found or no methods | Verify the address and that the repo contains METHODS.toml |
| `Method "X" not found` | `--method` filter doesn't match | Check available method names in the package |
| `No valid methods to publish` | No methods passed validation | Check METHODS.toml in the package |

For all error types and recovery strategies, see [Error Handling Reference](../shared/error-handling.md).

## Reference

- [Error Handling](../shared/error-handling.md) — read when CLI returns an error to determine recovery
- [MTHDS Agent Guide](../shared/mthds-agent-guide.md) — read for CLI command syntax or output format details
