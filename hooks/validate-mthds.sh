#!/usr/bin/env bash
# PostToolUse hook: lint, format, and validate .mthds files after Write/Edit
# Reads tool_input JSON from stdin, then runs (in order):
#   1. mthds-agent plxt lint     — TOML/schema-level linting (blocks on errors)
#   2. mthds-agent plxt fmt      — auto-format the file (only if lint passes)
#   3. mthds-agent pipelex validate bundle — semantic validation (blocks or warns)
# Passes silently if mthds-agent is not installed or file is not .mthds.

set -euo pipefail

# --- Read stdin (PostToolUse JSON) and extract file path ---
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Guard: no file path or not a .mthds file → pass silently
if [[ -z "$FILE_PATH" || "$FILE_PATH" != *.mthds || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# --- Require mthds-agent on PATH ---
if ! command -v mthds-agent &>/dev/null; then
  exit 0
fi

TMPOUT=$(mktemp)
TMPERR=$(mktemp)
trap 'rm -f "$TMPOUT" "$TMPERR"' EXIT

# =====================================================================
# STAGE 1: mthds-agent plxt lint — TOML/schema-level linting
# =====================================================================
LINT_EXIT=0
mthds-agent plxt lint "$FILE_PATH" >"$TMPOUT" 2>"$TMPERR" || LINT_EXIT=$?

if [[ "$LINT_EXIT" -ne 0 ]]; then
  LINT_OUTPUT=$(cat "$TMPERR")
  [[ -z "$LINT_OUTPUT" ]] && LINT_OUTPUT=$(cat "$TMPOUT")
  [[ -z "$LINT_OUTPUT" ]] && LINT_OUTPUT="lint exited with code $LINT_EXIT (no output)"

  # --- Filter tracing noise (INFO/ERROR summary lines carry no diagnostic value) ---
  LINT_OUTPUT=$(echo "$LINT_OUTPUT" | grep -v '^ INFO \|^ERROR ')

  # --- Truncate cascading errors to first 3 error blocks ---
  ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -c '^error:' || true)
  if [[ "$ERROR_COUNT" -gt 3 ]]; then
    LINT_OUTPUT=$(echo "$LINT_OUTPUT" | awk '/^error:/{n++} n<=3')
    LINT_OUTPUT="$LINT_OUTPUT

(+$((ERROR_COUNT - 3)) more errors, likely caused by the above)"
  fi

  # --- Shorten absolute paths to relative ---
  CWD=$(pwd)
  LINT_OUTPUT=$(echo "$LINT_OUTPUT" | sed "s|$CWD/||g")

  jq -n --arg reason "TOML/schema lint errors in $FILE_PATH:
$LINT_OUTPUT" \
    '{"decision":"block","reason":$reason}'
  exit 0
fi

# =====================================================================
# STAGE 2: mthds-agent plxt fmt — auto-format the file in-place (lint passed)
# =====================================================================
mthds-agent plxt fmt "$FILE_PATH" >"$TMPOUT" 2>"$TMPERR" || true

# =====================================================================
# STAGE 3: mthds-agent pipelex validate bundle — semantic validation
# =====================================================================
PARENT_DIR=$(dirname "$FILE_PATH")

EXIT_CODE=0
mthds-agent pipelex validate bundle "$FILE_PATH" -L "$PARENT_DIR/" >"$TMPOUT" 2>"$TMPERR" || EXIT_CODE=$?

# --- Parse results ---
if [[ "$EXIT_CODE" -eq 0 ]]; then
  exit 0
fi

# Error path: parse the stderr JSON
ERR_JSON=$(cat "$TMPERR")

# Check if we got valid JSON; if not, pass silently (unexpected output)
if ! echo "$ERR_JSON" | jq -e '.error' &>/dev/null; then
  exit 0
fi

ERROR_DOMAIN=$(echo "$ERR_JSON" | jq -r '.error_domain // empty')
ERROR_TYPE=$(echo "$ERR_JSON" | jq -r '.error_type // empty')
MESSAGE=$(echo "$ERR_JSON" | jq -r '.message // empty')
HINT=$(echo "$ERR_JSON" | jq -r '.hint // empty')
HAS_VALIDATION_ERRORS=$(echo "$ERR_JSON" | jq 'has("validation_errors") and (.validation_errors | length > 0)')
HAS_DRY_RUN_ERROR=$(echo "$ERR_JSON" | jq 'has("dry_run_error")')

# --- Decision logic ---

# Config or runtime domain → WARN only (not fixable by editing .mthds)
if [[ "$ERROR_DOMAIN" == "config" || "$ERROR_DOMAIN" == "runtime" ]]; then
  echo "[mthds-hook] Warning: $MESSAGE" >&2
  if [[ -n "$HINT" ]]; then
    echo "[mthds-hook] Hint: $HINT" >&2
  fi
  exit 0
fi

# Structural validation_errors present → BLOCK
if [[ "$HAS_VALIDATION_ERRORS" == "true" ]]; then
  # Build a summary of validation errors for the block reason
  PIPE_NAMES=$(echo "$ERR_JSON" | jq -r '[.validation_errors[].pipe_code // "unknown"] | unique | join(", ")')
  ERROR_COUNT=$(echo "$ERR_JSON" | jq '.validation_errors | length')
  ERROR_DETAILS=$(echo "$ERR_JSON" | jq -r '.validation_errors[] | "- [\(.pipe_code // "unknown")] \(.message)"')

  REASON=$(jq -n --arg pipe_names "$PIPE_NAMES" \
                  --arg error_count "$ERROR_COUNT" \
                  --arg details "$ERROR_DETAILS" \
                  --arg file "$FILE_PATH" \
    '$file + " has " + $error_count + " validation error(s) in pipe(s): " + $pipe_names + "\n" + $details')
  # Remove surrounding quotes from jq -n output
  REASON=$(echo "$REASON" | sed 's/^"//;s/"$//')

  jq -n --arg reason "$REASON" '{"decision":"block","reason":$reason}'
  exit 0
fi

# dry_run_error only (no validation_errors) → WARN
if [[ "$HAS_DRY_RUN_ERROR" == "true" ]]; then
  DRY_RUN_MSG=$(echo "$ERR_JSON" | jq -r '.dry_run_error // empty')
  echo "[mthds-hook] Warning (dry-run): $MESSAGE" >&2
  if [[ -n "$DRY_RUN_MSG" ]]; then
    echo "[mthds-hook] Dry-run detail: $DRY_RUN_MSG" >&2
  fi
  if [[ -n "$HINT" ]]; then
    echo "[mthds-hook] Hint: $HINT" >&2
  fi
  exit 0
fi

# Other input-domain errors without validation_errors → WARN
echo "[mthds-hook] Warning: $ERROR_TYPE — $MESSAGE" >&2
if [[ -n "$HINT" ]]; then
  echo "[mthds-hook] Hint: $HINT" >&2
fi
exit 0
