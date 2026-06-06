# CLAUDE.md

Claude Code compatibility entrypoint for ree-board.

Read `AGENTS.md` first. It is the canonical source for project rules, commands, security requirements, implementation standards, database workflow, realtime rules, and reviewer expectations.

Claude-specific setup remains in `.claude/`:

- `.claude/settings.json`: Claude Code hook configuration.
- `.claude/hooks/`: Claude Code hook scripts configured by `.claude/settings.json`; after hook migration, these delegate to shared scripts in `scripts/agent-hooks/`.
- `.claude/skills/`: legacy Claude skill copies kept during migration.
- `.claude/agents/`: legacy Claude reviewer prompts kept during migration.

Prefer `.agents/skills/` for new shared skill content after that directory exists; until then, keep Claude-specific skill updates in `.claude/skills/`.
