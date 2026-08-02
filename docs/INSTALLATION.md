# Installation

1. Back up or commit the current project.
2. Copy `.cursor/` and `docs/` into the repository root.
3. Open the repository root as the Cursor workspace.
4. Confirm that `.cursor/rules/*.mdc` is visible.
5. Start with the baseline audit prompt in `docs/INITIAL_AUDIT_PROMPT.md`.
6. Review generated changes before committing.

## Activation Model
- `alwaysApply: true`: included in every relevant Cursor conversation.
- `alwaysApply: false` plus a description: available for intelligent, relevance-based activation.
- These files do not run in the background. They guide Cursor when an agent or chat task is active.
