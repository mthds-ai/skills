"""Tests for scripts/check.py validation checks."""

from __future__ import annotations

from pathlib import Path

import pytest

from scripts.check import (
    check_body_text_versions,
    check_frontmatter_versions,
    check_shared_files_exist,
    check_stale_references,
    get_canonical_version,
)

CANONICAL = "0.1.2"

GUIDE_CONTENT = (
    "# MTHDS Agent Guide\n"
    "\n"
    "All skills in this plugin require `mthds-agent >= 0.1.2`. "
    "The Step 0 CLI Check in each skill enforces this — "
    "parse the output of `mthds-agent --version` and block execution "
    "if the version is below `0.1.2`.\n"
)

VALID_FRONTMATTER = (
    "---\n"
    "name: mthds-test\n"
    "min_mthds_version: 0.1.2\n"
    "description: Test skill\n"
    "---\n"
    "\n"
    "# Test Skill\n"
)

STEP0_BODY = (
    "---\n"
    "name: mthds-test\n"
    "min_mthds_version: 0.1.2\n"
    "description: Test skill\n"
    "---\n"
    "\n"
    "# Test Skill\n"
    "\n"
    "## Step 0\n"
    "\n"
    'Run `mthds-agent --version`. The minimum required version is **0.1.2**.\n'
    "\n"
    "- **If the version is below 0.1.2**: STOP.\n"
    "\n"
    "> This skill requires `mthds-agent` version 0.1.2 or higher (found *X.Y.Z*).\n"
    "\n"
    "- **If the version is 0.1.2 or higher**: proceed.\n"
)


@pytest.fixture()
def skill_tree(tmp_path: Path) -> Path:
    """Create a minimal valid skill directory structure."""
    shared = tmp_path / "skills" / "shared"
    shared.mkdir(parents=True)
    for name in ["error-handling.md", "mthds-agent-guide.md", "mthds-reference.md", "native-content-types.md"]:
        (shared / name).write_text("# placeholder\n")
    (shared / "mthds-agent-guide.md").write_text(GUIDE_CONTENT)

    skill_dir = tmp_path / "skills" / "mthds-test"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(VALID_FRONTMATTER)

    return tmp_path


class TestStaleReferences:
    def test_no_stale_refs(self, skill_tree: Path) -> None:
        assert check_stale_references(skill_tree) == []

    def test_detects_stale_ref(self, skill_tree: Path) -> None:
        skill_md = skill_tree / "skills" / "mthds-test" / "SKILL.md"
        skill_md.write_text(
            VALID_FRONTMATTER + "\nSee [guide](references/mthds-agent-guide.md)\n"
        )
        errors = check_stale_references(skill_tree)
        assert len(errors) == 1
        assert "stale references/" in errors[0]

    def test_ignores_correct_shared_path(self, skill_tree: Path) -> None:
        skill_md = skill_tree / "skills" / "mthds-test" / "SKILL.md"
        skill_md.write_text(
            VALID_FRONTMATTER + "\nSee [guide](../shared/mthds-agent-guide.md)\n"
        )
        assert check_stale_references(skill_tree) == []


class TestSharedFilesExist:
    def test_all_present(self, skill_tree: Path) -> None:
        assert check_shared_files_exist(skill_tree) == []

    def test_missing_file(self, skill_tree: Path) -> None:
        (skill_tree / "skills" / "shared" / "error-handling.md").unlink()
        errors = check_shared_files_exist(skill_tree)
        assert len(errors) == 1
        assert "error-handling.md" in errors[0]

    def test_all_missing(self, tmp_path: Path) -> None:
        (tmp_path / "skills" / "shared").mkdir(parents=True)
        errors = check_shared_files_exist(tmp_path)
        assert len(errors) == 4


class TestCanonicalVersion:
    def test_extracts_version(self, skill_tree: Path) -> None:
        assert get_canonical_version(skill_tree) == CANONICAL

    def test_raises_on_missing_pattern(self, skill_tree: Path) -> None:
        guide = skill_tree / "skills" / "shared" / "mthds-agent-guide.md"
        guide.write_text("# No version here\n\nJust some text.\n")
        with pytest.raises(ValueError, match="Cannot extract canonical version"):
            get_canonical_version(skill_tree)

    def test_raises_on_truncated_guide(self, skill_tree: Path) -> None:
        guide = skill_tree / "skills" / "shared" / "mthds-agent-guide.md"
        guide.write_text("# MTHDS Agent Guide\nRequires `mthds-agent >= 0.1.2`.\n")
        with pytest.raises(ValueError, match="only 2 line"):
            get_canonical_version(skill_tree)

    def test_raises_on_line3_mismatch(self, skill_tree: Path) -> None:
        guide = skill_tree / "skills" / "shared" / "mthds-agent-guide.md"
        guide.write_text(
            "# MTHDS Agent Guide\n"
            "\n"
            "Requires `mthds-agent >= 0.1.2`. Block if below `0.0.9`.\n"
        )
        with pytest.raises(ValueError, match="has 0.0.9, expected 0.1.2"):
            get_canonical_version(skill_tree)


class TestFrontmatterVersions:
    def test_matching_version(self, skill_tree: Path) -> None:
        assert check_frontmatter_versions(skill_tree, CANONICAL) == []

    def test_mismatched_version(self, skill_tree: Path) -> None:
        skill_md = skill_tree / "skills" / "mthds-test" / "SKILL.md"
        skill_md.write_text(VALID_FRONTMATTER.replace("0.1.2", "0.0.1"))
        errors = check_frontmatter_versions(skill_tree, CANONICAL)
        assert len(errors) == 1
        assert "0.0.1" in errors[0]

    def test_missing_version_key(self, skill_tree: Path) -> None:
        skill_md = skill_tree / "skills" / "mthds-test" / "SKILL.md"
        skill_md.write_text("---\nname: test\ndescription: test\n---\n\n# Test\n")
        errors = check_frontmatter_versions(skill_tree, CANONICAL)
        assert len(errors) == 1
        assert "no min_mthds_version" in errors[0]

    def test_no_frontmatter(self, skill_tree: Path) -> None:
        skill_md = skill_tree / "skills" / "mthds-test" / "SKILL.md"
        skill_md.write_text("# Just a heading\n")
        errors = check_frontmatter_versions(skill_tree, CANONICAL)
        assert len(errors) == 1
        assert "no frontmatter" in errors[0]

    def test_multiple_skills(self, skill_tree: Path) -> None:
        """Two skills: one correct, one wrong."""
        bad_dir = skill_tree / "skills" / "mthds-bad"
        bad_dir.mkdir()
        (bad_dir / "SKILL.md").write_text(VALID_FRONTMATTER.replace("0.1.2", "0.0.5"))
        errors = check_frontmatter_versions(skill_tree, CANONICAL)
        assert len(errors) == 1
        assert "mthds-bad" in errors[0]


class TestBodyTextVersions:
    def test_all_matching(self, skill_tree: Path) -> None:
        skill_md = skill_tree / "skills" / "mthds-test" / "SKILL.md"
        skill_md.write_text(STEP0_BODY)
        assert check_body_text_versions(skill_tree, CANONICAL) == []

    def test_mismatched_version(self, skill_tree: Path) -> None:
        skill_md = skill_tree / "skills" / "mthds-test" / "SKILL.md"
        content = STEP0_BODY.replace(
            "minimum required version is **0.1.2**",
            "minimum required version is **0.0.9**",
        )
        skill_md.write_text(content)
        errors = check_body_text_versions(skill_tree, CANONICAL)
        assert any("0.0.9" in e for e in errors)

    def test_no_step0_lines(self, skill_tree: Path) -> None:
        """Skills without Step 0 version lines produce no errors."""
        assert check_body_text_versions(skill_tree, CANONICAL) == []

    @pytest.mark.parametrize(
        "line",
        [
            'The minimum required version is **0.2.0**.',
            "If the version is below 0.2.0: STOP.",
            "version 0.2.0 or higher (found X.Y.Z).",
        ],
    )
    def test_various_patterns_mismatch(self, skill_tree: Path, line: str) -> None:
        skill_md = skill_tree / "skills" / "mthds-test" / "SKILL.md"
        skill_md.write_text(VALID_FRONTMATTER + f"\n{line}\n")
        errors = check_body_text_versions(skill_tree, CANONICAL)
        assert len(errors) >= 1
        assert any("0.2.0" in e for e in errors)
