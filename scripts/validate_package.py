#!/usr/bin/env python3
"""Validate Cursor MDC rules and required project-operating-system files."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
RULES = ROOT / ".cursor" / "rules"

REQUIRED = [
    ROOT / "README.md",
    ROOT / "docs" / "reports" / "PROJECT_STATUS.md",
    ROOT / "docs" / "reports" / "RISK_REGISTER.md",
    ROOT / "docs" / "roadmap" / "NEXT_ACTIONS.md",
    ROOT / "docs" / "architecture" / "ARCHITECTURE_OVERVIEW.md",
    ROOT / "docs" / "product" / "PRODUCT_SCOPE.md",
    ROOT / "docs" / "releases" / "RELEASE_CHECKLIST.md",
]

errors = []
mode_counts = {"always": 0, "agent-requested": 0, "auto-attached": 0, "manual": 0}

if not RULES.is_dir():
    errors.append("Missing .cursor/rules directory")
else:
    for path in sorted(RULES.glob("*.mdc")):
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---\n"):
            errors.append(f"{path.name}: missing opening frontmatter")
            continue

        parts = text.split("---", 2)
        if len(parts) != 3:
            errors.append(f"{path.name}: missing closing frontmatter")
            continue

        metadata = {}
        for line in parts[1].strip().splitlines():
            if ":" not in line:
                errors.append(f"{path.name}: invalid frontmatter line: {line}")
                continue
            key, value = line.split(":", 1)
            metadata[key.strip()] = value.strip().strip('"')

        always = metadata.get("alwaysApply")
        description = metadata.get("description", "")
        globs = metadata.get("globs", "")

        if always not in {"true", "false"}:
            errors.append(f"{path.name}: alwaysApply must be true or false")
            continue

        if always == "true":
            mode_counts["always"] += 1
        elif globs:
            mode_counts["auto-attached"] += 1
        elif description:
            mode_counts["agent-requested"] += 1
        else:
            mode_counts["manual"] += 1

        if not parts[2].strip():
            errors.append(f"{path.name}: empty rule body")

for required in REQUIRED:
    if not required.is_file():
        errors.append(f"Missing required file: {required.relative_to(ROOT)}")

print(f"Rule files: {sum(mode_counts.values())}")
for mode, count in mode_counts.items():
    print(f"{mode}: {count}")

if errors:
    print("\nVALIDATION FAILED")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("\nVALIDATION PASSED")
