# Error Handling Reference

Canonical reference for all `mthds-agent` error types, recovery strategies, and error classification.

## Error Output Format

On failure, `mthds-agent` prints JSON to **stderr** and exits with code 1:

```json
{
  "error": true,
  "error_type": "ValidateBundleError",
  "message": "Human-readable error description",
  "hint": "Suggested recovery action",
  "error_domain": "input",
  "retryable": false
}
```

Fields:
- `error_type` — error class name for programmatic matching
- `message` — human-readable description
- `hint` — (optional) suggested recovery action, auto-added for known error types
- `error_domain` — classifies the error source (see Error Domains below)
- `retryable` — (optional, boolean) when `true`, the error may succeed on retry without changes (e.g., transient network issues)
- Additional fields vary by error type (e.g., `validation_errors`, `pipe_code`, `model_handle`, `fallback_list`, `pipe_stack`)

## User-Requested Verbosity

When the user's message includes keywords like **"verbose"**, **"debug"**, **"more logs"**, or **"with logs"**, apply the corresponding log level to **every** `mthds-agent` invocation for the remainder of the task — not just on errors:

- "verbose" / "debug" / "more logs" / "with logs" → `--log-level debug` on all commands

When user-requested verbosity is active:
1. Add `--log-level <level>` before the subcommand on every `mthds-agent` call
2. Show the full stderr output inline in the conversation (do not swallow it)
3. Visually separate log output from the main result (use a "Logs:" label or similar)
4. Continue using the elevated log level for all subsequent commands until the task completes

This is independent of the error-triggered escalation below — user-requested verbosity applies proactively, while the Debugging Tip applies reactively after errors.

## Debugging Tip

When retrying a command after an error, increase the log level to capture diagnostic output in stderr:

```bash
# Debug output for troubleshooting
mthds-agent --log-level debug pipelex validate bundle.mthds -L dir/
```

`--log-level debug` adds context on what the CLI is doing — internal resolution steps, model routing details, and validation traces — without overwhelming output.

## Error Domains

| Domain | Meaning | Who Fixes |
|--------|---------|-----------|
| `input` | Bad .mthds, wrong CLI args, bad JSON | Agent can fix directly |
| `config` | Missing API keys, wrong model routing, environment issues | Environment/config changes needed |
| `runtime` | Pipeline execution failure, transient errors | Depends on cause |

## Validation Errors

When `mthds-agent pipelex validate` reports a `ValidateBundleError`, the JSON includes a `validation_errors` array:

```json
{
  "error": true,
  "error_type": "ValidateBundleError",
  "message": "Bundle validation failed",
  "hint": "Check the 'validation_errors' array for specific issues to fix",
  "error_domain": "input",
  "validation_errors": [
    {
      "error_type": "missing_input_variable",
      "pipe_code": "summarize_document",
      "message": "Missing input variable(s): context."
    }
  ]
}
```

### Validation Error Types

| Error Type | Meaning | Fix Strategy |
|------------|---------|--------------|
| `missing_input_variable` | Pipe prompt references a variable not in `inputs` | Add the missing variable to the pipe's `inputs` line |
| `extraneous_input_variable` | Pipe declares an input never used | Remove the unused variable from `inputs` |
| `input_stuff_spec_mismatch` | Input concept type doesn't match sub-pipe expectation | Correct the concept type in `inputs` |
| `inadequate_output_concept` | Output concept doesn't match connected pipes | Fix the `output` field to the correct concept |
| `inadequate_output_multiplicity` | Output single/list mismatch | Add or remove `[]` from the output concept |
| `circular_dependency_error` | Pipe references form a cycle | Restructure the method to break the cycle |
| `llm_output_cannot_be_image` | PipeLLM cannot output Image directly | Use PipeImgGen for image generation instead |
| `img_gen_input_not_text_compatible` | PipeImgGen needs text-compatible input | Ensure input is text-based (use `ImgGenPrompt`) |
| `invalid_pipe_code_syntax` | Pipe code doesn't follow snake_case | Rename the pipe to valid snake_case |
| `unknown_concept` | Referenced concept not defined in bundle | Add the concept definition, or fix the typo |
| `batch_item_name_collision` | `input_item_name` collides with `input_list_name` or an `inputs` key | Rename `input_item_name` to a distinct singular form (e.g., list `"reports"` → item `"report"`) |
| `unknown_validation_error` | Uncategorized validation issue | Read the `message` field for details |

## Model & Config Errors

These indicate environment issues, not .mthds file problems. **Cannot be fixed by editing the .mthds file.**

| Error Type | Meaning | Recovery |
|------------|---------|----------|
| `PipeOperatorModelChoiceError` | Model preset doesn't resolve to an available model | Run `mthds-agent pipelex doctor` — check routing configuration |
| `PipeOperatorModelAvailabilityError` | Model is configured but not reachable (missing API key, service down) | Run `mthds-agent pipelex doctor` — verify API keys and model availability |

Example output:
```json
{
  "error": true,
  "error_type": "PipeOperatorModelChoiceError",
  "error_domain": "config",
  "message": "No model found for preset '$writing-creative'",
  "hint": "Run 'mthds-agent pipelex doctor' to check available models and routing configuration",
  "pipe_code": "summarize",
  "model_type": "llm",
  "model_choice": "$writing-creative"
}
```

## Runtime Errors

| Error Type | Meaning | Recovery |
|------------|---------|----------|
| `PipelineExecutionError` | Pipeline failed during execution | Check `pipe_code` and `pipe_stack` in the error JSON |
| `BuildPipeError` | Automated build failed | Check `failure_memory_path` in error JSON for debugging details |
| `FileNotFoundError` | Bundle file or input file not found | Check file paths are correct |
| `JSONDecodeError` | Invalid JSON in inputs | Fix JSON syntax |
| `ArgumentError` | Invalid CLI flag combination | Check command flags (e.g., `--mock-inputs` requires `--dry-run`) |

## Cross-Domain Validation & Library Isolation

Pipelex loads `.mthds` files into a flat namespace. **Always use directory mode or `-L` pointing to the bundle's own directory** to avoid namespace collisions with other bundles in the project:

```bash
# ALWAYS use -L for validation (isolates from other bundles)
mthds-agent pipelex validate mthds-wip/pipeline_01/bundle.mthds -L mthds-wip/pipeline_01/

# ALWAYS use directory mode or -L for running
mthds-agent pipelex run mthds-wip/pipeline_01/ --dry-run --mock-inputs
```

When a bundle references pipes/concepts from other domains, add multiple `-L` flags:

```bash
# Load the bundle's directory AND shared pipes
mthds-agent pipelex validate my_bundle.mthds -L ./my_bundle_dir/ -L ./shared_pipes/
```
