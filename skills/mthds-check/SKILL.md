---
name: mthds-check
min_mthds_version: 0.1.0
description: Check and validate MTHDS bundles for issues. Use when user says "validate this", "check my workflow", "check my method", "does this .mthds make sense?", "review this pipeline", "any issues?", "is this correct?". Reports problems without modifying files. Read-only analysis.
---

# Check MTHDS bundles

Validate and review MTHDS bundles based on the MTHDS standard without making changes.

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

Do not write `.mthds` files manually, do not scan for existing methods, do not do any other work. The CLI is required for validation, formatting, and execution — without it the output will be broken.

> **No backend setup needed**: This skill works without configuring inference backends or API keys. You can start building/validating methods right away. Backend configuration is only needed to run methods with live inference — use `/pipelex-setup` when you're ready.

1. **Read the .mthds file** — Load and parse the method

2. **Run plxt lint** — Catch TOML syntax and schema errors before semantic validation (this skill is read-only and never triggers the PostToolUse hook, so lint must be run explicitly):
   ```bash
   mthds-agent plxt lint <file>.mthds
   ```
   If lint reports errors, include them in the final report and continue — semantic validation in the next step may reveal additional issues.

3. **Run CLI validation** (use `-L` pointing to the bundle's own directory to avoid namespace collisions):
   ```bash
   mthds-agent pipelex validate bundle <file>.mthds -L <bundle-directory>/
   ```

4. **Parse the JSON output**:
   - If `success: true` — all pipes validated, report clean status
   - If error — see [Error Handling Reference](../shared/error-handling.md) for error types and recovery

5. **Cross-domain validation** — when the bundle references pipes from other domains, use `--library-dir` (see [Error Handling — Cross-Domain](../shared/error-handling.md#cross-domain-validation))

6. **Analyze for additional issues** (manual review beyond CLI validation):
   - Unused concepts (defined but never referenced)
   - Unreachable pipes (not in main_pipe execution path)
   - Missing descriptions on pipes or concepts
   - Inconsistent naming conventions
   - Potential prompt issues (missing variables, unclear instructions)

7. **Report findings by severity**:
   - **Errors**: Validation failures from CLI (with `error_type` and `pipe_code`) and plxt lint errors
   - **Warnings**: Issues that may cause problems (e.g., model availability)
   - **Suggestions**: Improvements for maintainability

8. **Do NOT make changes** — This skill is read-only

## What Gets Checked

- TOML syntax and schema validation (via `mthds-agent plxt lint`)
- Concept definitions and references
- Pipe type configurations
- Input/output type matching
- Variable references in prompts
- Cross-domain references
- Naming convention compliance
- Model preset resolution (dry run)

## Reference

- [Error Handling](../shared/error-handling.md) — read when CLI returns an error to determine recovery
- [MTHDS Agent Guide](../shared/mthds-agent-guide.md) — read for CLI command syntax or output format details
- [MTHDS Language Reference](../shared/mthds-reference.md) — read when reviewing .mthds TOML syntax
- [Native Content Types](../shared/native-content-types.md) — read when checking `$var.field` references in prompts to verify the attribute exists on the content type
