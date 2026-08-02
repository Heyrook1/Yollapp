# Yolla AI Engineering Operating System — Audited Edition

This package provides Cursor `.mdc` rules and living project documents for a structured AI engineering workflow.

## Verified Package Contents

- 69 Cursor `.mdc` rules
- 18 always-applied core roles
- 51 intelligently requested councils, guardians, and audit engines
- CTO Living Project Intelligence
- Project status, risk, roadmap, architecture, product, design-system, metrics, release, ADR, audit, decision, and changelog templates
- Local package validation script

## How It Works

The core leadership and engineering roles use `alwaysApply: true`.

Specialized councils and guardians use `alwaysApply: false` with a clear description. Cursor can include them when relevant, and you can also explicitly mention a rule when needed.

These rules do not execute in the background. They guide Cursor whenever you run a chat or agent task.

## Installation

Copy `.cursor/`, `docs/`, and optionally `scripts/` into the root of your project.

Then use `docs/INITIAL_AUDIT_PROMPT.md` for the first repository audit.

## Validation

Run:

```bash
python scripts/validate_package.py
```

## Important

The initial status documents intentionally contain `Unknown` values. The CTO must replace them only after inspecting the real repository. This prevents fabricated progress percentages and unsupported readiness claims.
