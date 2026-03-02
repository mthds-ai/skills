---
name: pipelex-setup
min_mthds_version: 0.1.0
description: Set up Pipelex inference configuration — choose backends and configure API keys. Use when user says "set up pipelex", "configure backends", "configure inference", "set up API keys", "pipelex setup", "pipelex init", wants to run methods for the first time, or gets a config/credential error when running.
---

# Set Up Pipelex Inference Configuration

Guided setup for configuring the Pipelex runtime with inference backends and API keys. This is only needed to **run** methods with live inference — building, validating, editing, and dry-running work without any configuration.

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

### Step 1 — Check Pipelex Runtime

Run `pipelex-agent --version` to check if the Pipelex runtime is installed.

- **If not installed**: Tell the user:

> The Pipelex runtime is not installed. Install it with:
>
> ```
> curl -fsSL https://pipelex.com/install.sh | sh
> ```
>
> Or alternatively: `pip install pipelex`

Wait for confirmation, then proceed.

### Step 2 — Assess Current State

Run `mthds-agent pipelex doctor` to check the current configuration health.

- **If healthy** (backends configured, credentials valid): Tell the user their setup is already complete. Suggest trying `/run` on a method.
- **If issues found**: Show the doctor output and proceed to Step 3 to fix them.

### Step 3 — Choose Backends

Ask the user which backends they want to configure. Two paths:

#### Option A — Pipelex Gateway (simplest)

The Pipelex Gateway provides access to multiple AI models through a single API key.

1. Ask the user: "Do you accept the Pipelex Gateway Terms of Service and Privacy Policy? See: https://www.pipelex.com/privacy-policy"
2. If they accept: they need a gateway API key from app.pipelex.com
3. If they decline: proceed with Option B instead

#### Option B — Bring Your Own Key (BYOK)

The user provides their own API keys for individual providers.

1. Ask which providers they want to enable. Common options: `openai`, `anthropic`. Run `mthds-agent pipelex init --help` to discover all available backends.
2. If 2+ backends are selected, ask which should be the `primary_backend`.

### Step 4 — Telemetry Preference

Ask the user: "Do you want anonymous telemetry enabled?"

- `"off"` — no telemetry
- `"anonymous"` — anonymous usage data

### Step 5 — Apply Configuration

**You MUST have all answers from Steps 3-4 before running this command.**

Build the JSON config and run:

```bash
# Example: Pipelex Gateway (user accepted terms):
mthds-agent pipelex init -g --config '{"backends": ["pipelex_gateway"], "accept_gateway_terms": true, "telemetry_mode": "anonymous"}'

# Example: BYOK with OpenAI only:
mthds-agent pipelex init -g --config '{"backends": ["openai"], "telemetry_mode": "off"}'

# Example: BYOK with multiple backends:
mthds-agent pipelex init -g --config '{"backends": ["openai", "anthropic"], "primary_backend": "anthropic", "telemetry_mode": "off"}'
```

- `-g` targets the global `~/.pipelex/` directory. Without it, targets project-level `.pipelex/` (requires a project root).
- Config JSON schema: `{"backends": list[str], "primary_backend": str, "accept_gateway_terms": bool, "telemetry_mode": str}`. All fields optional.
- When `pipelex_gateway` is in backends, `accept_gateway_terms` must be set.
- When 2+ backends are selected without `pipelex_gateway`, `primary_backend` is required.

### Step 6 — Set API Keys (BYOK only)

If the user chose BYOK (Option B), guide them to set environment variables for their chosen backends:

- **OpenAI**: `export OPENAI_API_KEY="sk-..."`
- **Anthropic**: `export ANTHROPIC_API_KEY="sk-ant-..."`

Recommend adding these to their shell profile (`~/.zshrc`, `~/.bashrc`, etc.) for persistence.

After the user confirms they've set the keys, run `mthds-agent pipelex doctor` again to verify everything is healthy.

### Step 7 — Confirm Success

Once the doctor reports a healthy configuration:

1. Confirm the setup is complete
2. Suggest trying `/run` on a method to test the configuration

## Reference

- [Error Handling](../shared/error-handling.md) — read when CLI returns an error to determine recovery
- [MTHDS Agent Guide](../shared/mthds-agent-guide.md) — read for CLI command syntax or output format details
