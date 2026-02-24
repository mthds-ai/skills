# CLI Prerequisites

Check `mthds-agent` availability before running commands:

1. Try `mthds-agent --version`
2. If not found, try `npx mthds-agent --version`
3. If neither works, guide install: `npm install -g mthds` or `npx mthds-agent`

Use whichever method works for all subsequent commands. All `mthds-agent` commands also accept a `--log-level` global option before the subcommand (e.g., `mthds-agent --log-level debug pipelex <command>`).
