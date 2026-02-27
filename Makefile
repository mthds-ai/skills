.PHONY: check help

SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c

SHARED := skills/shared
SHARED_FILES := error-handling.md mthds-agent-guide.md mthds-reference.md native-content-types.md

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

check: ## Verify shared refs, shared files, and version consistency
	@echo "Checking for stale references/ paths to shared files..."
	@if grep -rn 'references/\(error-handling\|mthds-agent-guide\|mthds-reference\|native-content-types\)' skills/*/SKILL.md 2>/dev/null; then \
		echo "FAIL: Found stale references/ paths to shared files (see above). Should use ../shared/ instead."; \
		exit 1; \
	fi
	@echo "  No stale references found."
	@echo "Checking all shared files exist..."
	@fail=0; \
	for f in $(SHARED_FILES); do \
		if [ ! -f $(SHARED)/$$f ]; then \
			echo "  MISSING: $(SHARED)/$$f"; \
			fail=1; \
		fi; \
	done; \
	if [ $$fail -eq 1 ]; then \
		echo "FAIL: Some shared files are missing."; \
		exit 1; \
	fi
	@echo "  All shared files present."
	@echo "Checking min_mthds_version consistency..."
	@canonical=$$(grep -oE 'mthds-agent >= [0-9]+\.[0-9]+\.[0-9]+' $(SHARED)/mthds-agent-guide.md | grep -oE '[0-9]+\.[0-9]+\.[0-9]+') || \
		{ echo "FAIL: Cannot extract canonical version from $(SHARED)/mthds-agent-guide.md"; exit 1; }; \
	fail=0; \
	for skill in skills/*/SKILL.md; do \
		ver=$$(sed -n '/^---$$/,/^---$$/{ s/^min_mthds_version: *//p; }' "$$skill"); \
		if [ -z "$$ver" ]; then \
			echo "  MISSING: $$skill has no min_mthds_version in front matter"; \
			fail=1; \
		elif [ "$$ver" != "$$canonical" ]; then \
			echo "  MISMATCH: $$skill has $$ver, expected $$canonical"; \
			fail=1; \
		fi; \
	done; \
	if [ $$fail -eq 1 ]; then \
		echo "FAIL: Version inconsistency detected (canonical: $$canonical from $(SHARED)/mthds-agent-guide.md)"; \
		exit 1; \
	fi
	@echo "  All versions consistent."
	@echo "All checks passed."
