# Agent Setup

## Canonical Guidance

`AGENTS.md` is the source of truth for repo-wide agent instructions.

`CLAUDE.md` is the Claude Code compatibility entrypoint that points back to `AGENTS.md`.

Agents that support `AGENTS.md` directly should use that file without an additional adapter.

Gemini supports `AGENTS.md`, so do not add `GEMINI.md` in this migration.

## Codex

Codex uses:

- `AGENTS.md` for repo instructions.
- `.agents/skills/*/SKILL.md` for repo-scoped skills.
- `.codex/config.toml` for project-level Codex defaults.
- `.codex/hooks.json` for lifecycle hooks.
- `.codex/agents/*.toml` for custom reviewer agents.

After changing Codex instructions, start a new Codex session from the repo root and ask:

```text
Summarize the active repo instructions and available repo skills.
```

## Claude Code

Claude Code uses:

- `CLAUDE.md` as its entrypoint.
- `.claude/settings.json` for Claude-specific hooks.
- `.claude/hooks/*.sh` as wrappers around `scripts/agent-hooks`.
- `.claude/skills` and `.claude/agents` as legacy compatibility copies.

## Shared Hooks

Reusable hook logic lives in `scripts/agent-hooks`.

Run checks manually with:

```bash
scripts/agent-hooks/branch-protection.sh
scripts/agent-hooks/format-check.sh app/page.tsx
scripts/agent-hooks/type-check.sh app/page.tsx
scripts/agent-hooks/test-runner.sh path/to/file.test.ts
```

## Skill Maintenance

Update `.agents/skills` first. While Claude compatibility is required, mirror the same content into `.claude/skills`.

## Reviewer Maintenance

Update `.codex/agents/*.toml` first. While Claude compatibility is required, mirror equivalent checklist changes into `.claude/agents/*.md`.
