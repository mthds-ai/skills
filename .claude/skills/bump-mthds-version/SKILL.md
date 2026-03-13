---
name: bump-mthds-version
description: >
  Update the minimum mthds-agent version required by all skills. Use when
  the user says "bump mthds version", "update min version", "raise minimum
  mthds version", "set mthds version to X.Y.Z", or any variation of changing
  the required CLI version across skills.
---

# Bump Minimum mthds-agent Version

This skill updates the `min_mthds_version` across all plugin skills in a single coordinated operation.

## Workflow

### 1. Determine the new version

Ask the user for the target version (semver `X.Y.Z`) unless they already specified it.

Show the current canonical version by reading line 3 of `skills/shared/mthds-agent-guide.md` — it contains `mthds-agent >= X.Y.Z`.

### 2. Update the canonical source

Edit `skills/shared/mthds-agent-guide.md` line 3. Replace both occurrences of the old version:

- `mthds-agent >= OLD` → `mthds-agent >= NEW`
- `` below `OLD` `` → `` below `NEW` ``

### 3. Update all SKILL.md files

**Important**: Read each `skills/*/SKILL.md` file before editing it (the Edit tool requires a prior read).

For each file matching `skills/*/SKILL.md`, replace all 5 occurrences of the old version with the new version. The old version string is specific enough to use `replace_all` safely — there are no other occurrences of it in these files.

**Strategy**: Use the Edit tool with `replace_all: true` to replace `OLD` → `NEW` in each file. This covers all 5 patterns in one operation:

1. **Frontmatter**: `min_mthds_version: OLD`
2. **Body — bold version**: `**OLD**` (in "minimum required version is **OLD**")
3. **Body — below check**: `below OLD` (in "If the version is below OLD")
4. **Body — version requirement**: `version OLD or higher` (in "requires `mthds-agent` version OLD or higher")
5. **Body — version gate**: `is OLD or higher` (in "If the version is OLD or higher")

### 4. Verify with grep

Run `grep -rc 'OLD' skills/*/SKILL.md skills/shared/mthds-agent-guide.md` (replacing `OLD` with the actual old version string). Every file must return `:0`. If any file still contains the old version, fix it before continuing.

### 5. Verify with `make check`

Run `make check` from the repo root. This validates shared refs, shared file existence, frontmatter version consistency, and body-text version consistency. If it fails, report the errors and fix them before continuing.

### 6. Report

List all modified files and show the version change: `OLD → NEW`.
