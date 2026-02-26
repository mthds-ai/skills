.PHONY: sync check clean-refs help

SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c

SHARED := skills/shared

# Which shared files each skill gets (error-handling + mthds-agent-guide go everywhere;
# mthds-reference + native-content-types go everywhere except pkg)
SKILLS_ALL  := build check edit explain fix inputs install pkg run
SKILLS_FULL := build check edit explain fix inputs run

SHARED_ALL  := error-handling.md mthds-agent-guide.md
SHARED_FULL := mthds-reference.md native-content-types.md

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

sync: ## Copy canonical shared files into each skill's references/
	@for skill in $(SKILLS_ALL); do \
		mkdir -p skills/$$skill/references; \
		for f in $(SHARED_ALL); do \
			cp $(SHARED)/$$f skills/$$skill/references/$$f; \
		done; \
	done
	@for skill in $(SKILLS_FULL); do \
		for f in $(SHARED_FULL); do \
			cp $(SHARED)/$$f skills/$$skill/references/$$f; \
		done; \
	done
	@echo "Synced shared references into all skills."

check: ## Verify no stale ../shared/ or ../build/ refs remain and copies match originals
	@echo "Checking for stale cross-skill references..."
	@if grep -rn '\.\./shared/\|\.\./build/' skills/*/SKILL.md 2>/dev/null; then \
		echo "FAIL: Found stale cross-skill references (see above)."; \
		exit 1; \
	fi
	@echo "  No stale references found."
	@echo "Checking synced files match canonical source..."
	@fail=0; \
	for skill in $(SKILLS_ALL); do \
		for f in $(SHARED_ALL); do \
			if ! diff -q $(SHARED)/$$f skills/$$skill/references/$$f >/dev/null 2>&1; then \
				echo "  DIFF: skills/$$skill/references/$$f"; \
				fail=1; \
			fi; \
		done; \
	done; \
	for skill in $(SKILLS_FULL); do \
		for f in $(SHARED_FULL); do \
			if ! diff -q $(SHARED)/$$f skills/$$skill/references/$$f >/dev/null 2>&1; then \
				echo "  DIFF: skills/$$skill/references/$$f"; \
				fail=1; \
			fi; \
		done; \
	done; \
	if [ $$fail -eq 1 ]; then \
		echo "FAIL: Some copies differ from shared/ originals. Run 'make sync'."; \
		exit 1; \
	fi
	@echo "  All copies match."
	@echo "All checks passed."

clean-refs: ## Remove all synced files from references/ directories
	@for skill in $(SKILLS_ALL); do \
		for f in $(SHARED_ALL); do \
			rm -f skills/$$skill/references/$$f; \
		done; \
	done
	@for skill in $(SKILLS_FULL); do \
		for f in $(SHARED_FULL); do \
			rm -f skills/$$skill/references/$$f; \
		done; \
	done
	@echo "Cleaned synced references."
