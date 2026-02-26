# CLI Prerequisites — HARD REQUIREMENT

Before doing anything else, run `mthds-agent --version` to verify the CLI is installed.

**If the command fails or is not found: STOP. Do not proceed with the skill.**

Tell the user:

> The `mthds-agent` CLI is required but not installed. No skill can run without it.
>
> Install it with: `npm install -g mthds`
>
> Then re-run this skill.

Do not attempt to write `.mthds` files without the CLI installed, or work around the missing CLI. Every skill depends on `mthds-agent` for validation, formatting, and execution. Without it, the output will be broken.

---

All `mthds-agent` commands also accept a `--log-level` global option before the subcommand (e.g., `mthds-agent --log-level debug pipelex <command>`).
