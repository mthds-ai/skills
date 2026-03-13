#!/usr/bin/env python3
"""Validate shared references, shared files, and version consistency across skills."""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Shared files that must exist in skills/shared/
SHARED_FILES = [
    "error-handling.md",
    "mthds-agent-guide.md",
    "mthds-reference.md",
    "native-content-types.md",
]

# Pattern that extracts the canonical version from mthds-agent-guide.md
CANONICAL_VERSION_PATTERN = re.compile(r"mthds-agent >= (\d+\.\d+\.\d+)")

# Stale reference patterns — shared file stems that should use ../shared/ not references/
STALE_REF_PATTERN = re.compile(
    r"references/(?:error-handling|mthds-agent-guide|mthds-reference|native-content-types)"
)

# Frontmatter extraction: min_mthds_version value between --- delimiters
FRONTMATTER_VERSION_PATTERN = re.compile(r"^min_mthds_version:\s*(.+)$", re.MULTILINE)

# Body-text lines that embed a version reference (Step 0 sections)
BODY_TEXT_PATTERNS = re.compile(
    r"(minimum required version is \*\*|version is below |version .* or higher)"
)

SEMVER_PATTERN = re.compile(r"\d+\.\d+\.\d+")


def check_stale_references(base_dir: Path) -> list[str]:
    """Check 1: No SKILL.md files should reference shared files via references/ paths."""
    errors: list[str] = []
    for skill_md in sorted(base_dir.glob("skills/*/SKILL.md")):
        for i, line in enumerate(skill_md.read_text().splitlines(), start=1):
            if STALE_REF_PATTERN.search(line):
                rel = skill_md.relative_to(base_dir)
                errors.append(f"{rel}:{i}: stale references/ path (should use ../shared/)")
    return errors


def check_shared_files_exist(base_dir: Path) -> list[str]:
    """Check 2: All expected shared files must be present."""
    shared_dir = base_dir / "skills" / "shared"
    errors: list[str] = []
    for name in SHARED_FILES:
        if not (shared_dir / name).is_file():
            errors.append(f"MISSING: skills/shared/{name}")
    return errors


def get_canonical_version(base_dir: Path) -> str:
    """Extract the canonical mthds-agent version from mthds-agent-guide.md.

    The canonical version comes from the first 'mthds-agent >= X.Y.Z' match.
    Also validates that all semver strings on line 3 match the canonical version.
    """
    guide = base_dir / "skills" / "shared" / "mthds-agent-guide.md"
    if not guide.is_file():
        raise ValueError(f"File not found: {guide.relative_to(base_dir)}")
    text = guide.read_text()

    match = CANONICAL_VERSION_PATTERN.search(text)
    if not match:
        raise ValueError(f"Cannot extract canonical version from {guide.relative_to(base_dir)}")

    canonical = match.group(1)

    # Validate line 3 consistency (all semver strings on that line must match)
    lines = text.splitlines()
    if len(lines) < 3:
        raise ValueError(
            f"{guide.relative_to(base_dir)} has only {len(lines)} line(s), expected at least 3"
        )

    line3_versions = SEMVER_PATTERN.findall(lines[2])
    if not line3_versions:
        raise ValueError(
            f"Cannot extract version(s) from line 3 of {guide.relative_to(base_dir)}"
        )
    for v in line3_versions:
        if v != canonical:
            raise ValueError(
                f"{guide.relative_to(base_dir)} line 3 has {v}, expected {canonical}"
            )

    return canonical


def check_frontmatter_versions(base_dir: Path, canonical: str) -> list[str]:
    """Check 3: All SKILL.md frontmatter min_mthds_version must match canonical."""
    errors: list[str] = []
    for skill_md in sorted(base_dir.glob("skills/*/SKILL.md")):
        text = skill_md.read_text()
        rel = skill_md.relative_to(base_dir)

        # Extract frontmatter (between first two --- lines)
        parts = text.split("---", 2)
        if len(parts) < 3:
            errors.append(f"{rel}: no frontmatter found")
            continue

        frontmatter = parts[1]
        match = FRONTMATTER_VERSION_PATTERN.search(frontmatter)
        if not match:
            errors.append(f"{rel}: no min_mthds_version in frontmatter")
            continue

        version = match.group(1).strip()
        if version != canonical:
            errors.append(f"{rel}: has {version}, expected {canonical}")

    return errors


def check_body_text_versions(base_dir: Path, canonical: str) -> list[str]:
    """Check 4: Version references in Step 0 body text must match canonical."""
    errors: list[str] = []
    for skill_md in sorted(base_dir.glob("skills/*/SKILL.md")):
        rel = skill_md.relative_to(base_dir)
        for i, line in enumerate(skill_md.read_text().splitlines(), start=1):
            if not BODY_TEXT_PATTERNS.search(line):
                continue
            versions = SEMVER_PATTERN.findall(line)
            if not versions:
                errors.append(f"{rel}:{i}: Step 0 line missing semver: {line.strip()}")
            else:
                for v in versions:
                    if v != canonical:
                        errors.append(
                            f"{rel}:{i}: body text has {v}, expected {canonical}"
                        )
    return errors


def main() -> int:
    base_dir = Path(__file__).resolve().parent.parent
    failed = False

    # Check 1: stale references
    print("Checking for stale references/ paths to shared files...")
    errors = check_stale_references(base_dir)
    if errors:
        for e in errors:
            print(f"  {e}")
        print("FAIL: Found stale references/ paths (should use ../shared/ instead).")
        failed = True
    else:
        print("  No stale references found.")

    # Check 2: shared files exist
    print("Checking all shared files exist...")
    errors = check_shared_files_exist(base_dir)
    if errors:
        for e in errors:
            print(f"  {e}")
        print("FAIL: Some shared files are missing.")
        failed = True
    else:
        print("  All shared files present.")

    # Check 3 & 4 require the canonical version
    print("Checking min_mthds_version consistency...")
    try:
        canonical = get_canonical_version(base_dir)
    except ValueError as exc:
        print(f"  {exc}")
        print("FAIL: Cannot determine canonical version.")
        return 1

    errors = check_frontmatter_versions(base_dir, canonical)
    if errors:
        for e in errors:
            print(f"  MISMATCH: {e}")
        print(f"FAIL: Version inconsistency detected (canonical: {canonical}).")
        failed = True
    else:
        print("  All frontmatter versions consistent.")

    # Check 4: body-text versions
    print("Checking body-text version references in Step 0 sections...")
    errors = check_body_text_versions(base_dir, canonical)
    if errors:
        for e in errors:
            print(f"  {e}")
        print(f"FAIL: Body-text version mismatch detected (canonical: {canonical}).")
        failed = True
    else:
        print("  All body-text versions consistent.")

    if failed:
        return 1

    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
