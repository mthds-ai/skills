SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c

VIRTUAL_ENV := $(CURDIR)/.venv
VENV_PYTHON := "$(VIRTUAL_ENV)/bin/python"
VENV_PYTEST := "$(VIRTUAL_ENV)/bin/pytest"

.PHONY: check agent-check test agent-test gha-tests env install help

### SETUP

env: ## Create virtual environment
	@test -d "$(VIRTUAL_ENV)" || uv venv "$(VIRTUAL_ENV)" --quiet

install: env ## Install dev dependencies
	@uv sync --all-extras --quiet

### CHECKS

check: ## Verify shared refs, shared files, and version consistency
	@python3 scripts/check.py

agent-check: ## Run checks quietly (output only on failure)
	@echo "• Running checks..."
	@tmpfile=$$(mktemp); \
	if python3 scripts/check.py > "$$tmpfile" 2>&1; then \
		exit_code=0; \
	else \
		exit_code=$$?; \
	fi; \
	if [ $$exit_code -ne 0 ]; then cat "$$tmpfile"; fi; \
	rm -f "$$tmpfile"; \
	if [ $$exit_code -eq 0 ]; then echo "• All checks passed."; fi; \
	exit $$exit_code

### TESTING

test: install ## Run unit tests
	@$(VENV_PYTEST) tests/ -v

gha-tests: install ## Run tests for GitHub Actions (exit on first failure, quiet)
	@$(VENV_PYTEST) --exitfirst --quiet

agent-test: install ## Run unit tests quietly (output only on failure)
	@echo "• Running unit tests..."
	@tmpfile=$$(mktemp); \
	if $(VENV_PYTEST) -o log_level=WARNING --tb=short -q > "$$tmpfile" 2>&1; then \
		exit_code=0; \
	else \
		exit_code=$$?; \
	fi; \
	if [ $$exit_code -ne 0 ]; then cat "$$tmpfile"; fi; \
	rm -f "$$tmpfile"; \
	if [ $$exit_code -eq 0 ]; then echo "• All tests passed."; fi; \
	exit $$exit_code

### HELP

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'
