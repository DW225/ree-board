# Codex And Agent Setup Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing Claude Code setup into a shared, Codex-first, agent-neutral setup while keeping Claude Code usable.

**Architecture:** Keep durable project rules in `AGENTS.md`, keep Claude-specific compatibility in `CLAUDE.md`, move reusable skill content into `.agents/skills`, and add Codex-specific adapters under `.codex`. Shared shell checks live in `scripts/agent-hooks` so Claude hooks and Codex hooks can call the same logic.

**Tech Stack:** Next.js 16, React 19, TypeScript, pnpm, Jest, ESLint, Drizzle, Turso, Supabase, Ably, Codex `AGENTS.md`, Codex `.agents/skills`, Codex `.codex/config.toml`, Codex `.codex/hooks.json`, Codex `.codex/agents/*.toml`.

---

## Current Setup Review

The current Claude setup consists of:

- `CLAUDE.md`: project memory, commands, security rules, implementation patterns, database workflow, testing strategy, skill activation list, reviewer agent list, environment variables, and troubleshooting.
- `.claude/settings.json`: Claude-only environment values and hooks for `PreToolUse` and `PostToolUse`.
- `.claude/hooks/*.sh`: branch protection, ESLint-on-edited-file, project TypeScript check, and test-file runner.
- `.claude/skills/*/SKILL.md`: six domain skills for Next.js App Router, Drizzle, RBAC, Ably, signals, and testing.
- `.claude/agents/*.md`: two reviewer prompts for security and database changes.
- `.gitignore`: ignores `.claude/settings.local.json` only.

What should be reused:

- Project rules in `CLAUDE.md`.
- Domain skill content in `.claude/skills`.
- Security and database reviewer checklists in `.claude/agents`.
- Hook check logic, after removing Claude-only environment variable assumptions.

What should change:

- `CLAUDE.md` should stop being the only source of durable repo guidance.
- Shared instructions should live in `AGENTS.md`, because Codex discovers that file automatically from the repo root and nested directories.
- Skills should be copied to `.agents/skills`, because Codex scans repo skills from `.agents/skills`.
- Codex hooks should live in `.codex/hooks.json` and call reusable scripts from `scripts/agent-hooks`.
- Codex custom reviewer agents should live in `.codex/agents/*.toml`.
- Hook scripts should accept generic file path arguments in addition to Claude environment variables.

## File Structure

- Create `AGENTS.md`: agent-neutral project instructions loaded by Codex and readable by other agents.
- Modify `CLAUDE.md`: make it a Claude compatibility entrypoint that points to `AGENTS.md` and `.agents/skills`, while retaining Claude-specific notes only where useful.
- Create `.agents/skills/README.md`: agent-neutral skill catalog.
- Create `.agents/skills/ably-realtime/SKILL.md`: migrated Ably skill.
- Create `.agents/skills/drizzle-patterns/SKILL.md`: migrated Drizzle skill.
- Create `.agents/skills/nextjs-app-router/SKILL.md`: migrated Next.js skill.
- Create `.agents/skills/rbac-security/SKILL.md`: migrated RBAC skill.
- Create `.agents/skills/signal-state-management/SKILL.md`: migrated signals skill.
- Create `.agents/skills/testing-patterns/SKILL.md`: migrated testing skill.
- Create `scripts/agent-hooks/branch-protection.sh`: generic branch protection script.
- Create `scripts/agent-hooks/format-check.sh`: generic edited-file ESLint script.
- Create `scripts/agent-hooks/type-check.sh`: generic TypeScript project check script.
- Create `scripts/agent-hooks/test-runner.sh`: generic edited-test-file Jest script.
- Modify `.claude/hooks/*.sh`: delegate to `scripts/agent-hooks/*.sh`.
- Create `.codex/config.toml`: project-level Codex defaults that keep sandboxing conservative and enable hooks.
- Create `.codex/hooks.json`: Codex lifecycle hook wiring for `apply_patch`, `Edit`, and `Write`.
- Create `.codex/agents/security-reviewer.toml`: Codex custom security reviewer.
- Create `.codex/agents/database-reviewer.toml`: Codex custom database reviewer.
- Create `docs/AGENT_SETUP.md`: maintenance guide for Claude, Codex, and future agents.
- Modify `.gitignore`: add local Codex log/cache ignores without ignoring checked-in `.codex` setup.

---

### Task 1: Add Shared Repo Instructions

**Files:**
- Create: `AGENTS.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Create a refined `AGENTS.md` from the durable parts of `CLAUDE.md`**

Do not copy `CLAUDE.md` mechanically. Refine it into concise, agent-neutral guidance:

- Keep stable repo facts, commands, security rules, implementation standards, verification expectations, and domain workflows.
- Remove Claude-specific wording, hook environment variables, Claude auto-activation claims, emojis, and verbose examples that belong in skills.
- Prefer short rules over long tutorial sections.
- Keep `AGENTS.md` below Codex's default project document limit.
- Move detailed examples into `.agents/skills` when they are skill-specific.

Use this file structure:

```md
# AGENTS.md

## Project

ree-board is a collaborative retrospective board application.

## Tech Stack

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- Backend: Next.js server actions with Drizzle ORM
- Database: Turso SQLite; local database file is `test.db`
- Auth: Supabase Auth with RBAC
- Real-time: Ably
- State: Preact Signals
- UI: Radix UI and Shadcn/ui components
- Testing: Jest with ts-jest

## Commands

- `pnpm dev`: start the Next.js dev server
- `pnpm dev:sql`: start the local Turso database
- `pnpm test`: run Jest tests
- `pnpm lint`: run ESLint
- `npx tsc --noEmit`: run the TypeScript project check
- `pnpm generate`: generate Drizzle migrations
- `pnpm push:dev`: push schema to the local development database
- `pnpm push`: push schema to the configured production database

## Required Checks

- Run `pnpm lint` after TypeScript or React edits.
- Run `npx tsc --noEmit` after TypeScript edits.
- Run the most specific Jest test for changed testable behavior.
- Run `pnpm test` when shared logic, security, database, realtime, or auth behavior changes.

## Security Rules

- Never create or modify server actions without `actionWithAuth` or `rbacWithAuth`.
- Guests are read-only and must not perform mutations.
- Validate untrusted input with Zod before use.
- Validate Ably message payloads before processing.
- Never expose server-only secrets through `NEXT_PUBLIC_*`.
- Avoid `dangerouslySetInnerHTML`; sanitize markdown with `rehype-sanitize`.

## Implementation Rules

- Prefer `interface` for object shapes and `type` for unions or utilities.
- Do not use `any`; use `unknown` or explicit types.
- Use early returns instead of deeply nested conditionals.
- Use `import type` for type-only imports.
- All interactive UI must cover loading, error, empty, and success states.
- Mutations must disable repeated submission, show progress, handle errors visibly, and confirm success.

## Database Rules

- Use Nano IDs for table primary keys.
- Index foreign keys and frequently filtered columns.
- Define Drizzle relations for foreign keys.
- Use prepared statements for repeated queries.
- Use transactions for multi-table writes.
- Review generated SQL before pushing migrations.

## Realtime Rules

- Use `board:{boardId}` for board channel names.
- Validate every inbound message with Zod.
- Drop stale messages older than 30 seconds unless a feature explicitly documents a different threshold.
- Keep optimistic UI updates reconciled with server state.

## Skills

Use repo skills from `.agents/skills` when work matches their descriptions:

- `nextjs-app-router`
- `drizzle-patterns`
- `rbac-security`
- `ably-realtime`
- `signal-state-management`
- `testing-patterns`

## Reviewer Agents

Use specialized review for:

- Security-sensitive changes in `lib/actions`, `lib/realtime`, auth flows, and server components.
- Database changes in `db/schema.ts`, `lib/db`, and `drizzle`.

## Git

- Branch names follow Conventional Branch: `<type>/<description>`.
- Use `feature/` or `feat/` for new features, `fix/` for bug fixes, `hotfix/` for urgent fixes, `release/` for release preparation, and `chore/` for non-code tasks.
- Commits use Conventional Commits.
- Do not overwrite unrelated user changes.
```

- [ ] **Step 2: Run a size check**

Run:

```bash
wc -c AGENTS.md
```

Expected: output is below `32768 AGENTS.md` so Codex can load the full root instructions with the default project document limit.

- [ ] **Step 3: Refine `CLAUDE.md` into a compatibility entrypoint**

Keep Claude-specific discovery useful, but do not duplicate canonical project rules. `CLAUDE.md` should point Claude Code to `AGENTS.md`, describe the remaining `.claude` compatibility files, and explain which location to update first.

```md
# CLAUDE.md

Claude Code compatibility entrypoint for ree-board.

Read `AGENTS.md` first. It is the canonical source for project rules, commands, security requirements, implementation standards, database workflow, realtime rules, and reviewer expectations.

Claude-specific setup remains in `.claude/`:

- `.claude/settings.json`: Claude Code hook configuration.
- `.claude/hooks/`: thin wrappers that delegate to shared scripts in `scripts/agent-hooks/`.
- `.claude/skills/`: legacy Claude skill copies kept during migration.
- `.claude/agents/`: legacy Claude reviewer prompts kept during migration.

Prefer `.agents/skills/` for new or updated skill content.
```

- [ ] **Step 4: Check for instruction drift between `AGENTS.md` and `CLAUDE.md`**

Run:

```bash
grep -n "Claude\\|CLAUDE\\|CLAUDE_TOOL\\|CLAUDE_PROJECT" AGENTS.md
grep -n "CRITICAL\\|Security Rules\\|Commands\\|Tech Stack" CLAUDE.md
```

Expected:

- First command prints no output.
- Second command only prints compatibility references if present; canonical repo rules should live in `AGENTS.md`.

- [ ] **Step 5: Commit**

Run:

```bash
git add AGENTS.md CLAUDE.md docs/superpowers/plans/2026-06-06-agent-setup-migration.md
git commit -m "docs: add shared agent instructions"
```

Expected: commit succeeds.

---

### Task 2: Migrate Skills To Codex-Compatible Repo Skills

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Create: `.agents/skills/README.md`
- Create: `.agents/skills/ably-realtime/SKILL.md`
- Create: `.agents/skills/drizzle-patterns/SKILL.md`
- Create: `.agents/skills/nextjs-app-router/SKILL.md`
- Create: `.agents/skills/rbac-security/SKILL.md`
- Create: `.agents/skills/signal-state-management/SKILL.md`
- Create: `.agents/skills/testing-patterns/SKILL.md`

- [ ] **Step 1: Copy the existing skill directories**

Run:

```bash
mkdir -p .agents/skills
cp -R .claude/skills/ably-realtime .agents/skills/
cp -R .claude/skills/drizzle-patterns .agents/skills/
cp -R .claude/skills/nextjs-app-router .agents/skills/
cp -R .claude/skills/rbac-security .agents/skills/
cp -R .claude/skills/signal-state-management .agents/skills/
cp -R .claude/skills/testing-patterns .agents/skills/
```

Expected: `.agents/skills/*/SKILL.md` exists for all six skills.

- [ ] **Step 2: Rewrite `.agents/skills/README.md`**

```md
# Agent Skills

These repo-scoped skills provide reusable ree-board domain guidance for Codex and compatible agents.

## Available Skills

- `nextjs-app-router`: Next.js 16 App Router, server components, client components, server actions, routing, metadata, and caching.
- `drizzle-patterns`: Drizzle ORM, Turso SQLite, schema design, migrations, prepared statements, indexes, transactions, and query optimization.
- `rbac-security`: Supabase auth, RBAC, server action wrappers, Zod validation, realtime validation, XSS, SQL injection, and secret handling.
- `ably-realtime`: Ably channels, message validation, staleness filtering, collaboration, optimistic updates, and recovery.
- `signal-state-management`: Preact Signals, computed values, batched updates, domain state organization, and React integration.
- `testing-patterns`: Jest, test organization, factories, mocks, fake timers, realtime tests, server action tests, and TDD workflow.

## Maintenance

- Keep skill descriptions concise and trigger-focused.
- Keep examples current with the codebase.
- Update the matching legacy `.claude/skills` copy only while Claude compatibility is required.
```

- [ ] **Step 3: Replace Claude-specific language in migrated skills**

Run:

```bash
grep -RIn "Claude\\|claude\\|CLAUDE" .agents/skills
```

For each match, replace platform-specific wording with agent-neutral wording. Examples:

```md
Skills are in `.agents/skills/` and agents should use them when the task matches the skill description.
```

Expected after edits:

```bash
grep -RIn "Claude\\|claude\\|CLAUDE" .agents/skills
```

prints no output.

- [ ] **Step 4: Normalize stale copied examples**

Run:

```bash
grep -RInE '"went_well"|'\'went_well\''|"to_improve"|'\'to_improve\''|"action_items"|'\'action_items\''|post:create|post:update|post:delete|post:move|post:vote|member:join|processPostUpdate|Kinde|kinde|mockKinde|getKinde|model: sonnet|model: opus|BoardMessageSchema|message\.data\.timestamp|Always Include Timestamp' .agents/skills
```

Expected: no output.

When matches appear, update the examples to current repo primitives:

- Use `PostType.went_well`, `PostType.to_improvement`, `PostType.to_discuss`, and `PostType.action_item`.
- Use `EVENT_TYPE.*` constants from `lib/utils/ably`.
- Use `processPostMessage` from `lib/realtime/messageProcessors`.
- Use `verifySession` from `lib/dal`.
- Use `Role.*` from `lib/constants/role`.
- Include timestamps only for payload schemas that require staleness filtering.

- [ ] **Step 5: Verify skill frontmatter**

Run:

```bash
find .agents/skills -name SKILL.md -maxdepth 3 -print -exec sed -n '1,8p' {} \;
```

Expected: each `SKILL.md` has YAML frontmatter with `name` and `description`.

- [ ] **Step 6: Refresh instruction references now shared skills exist**

Update `AGENTS.md` so the Skills section points directly to `.agents/skills`.

Update `CLAUDE.md` so `.claude/skills/` is described as a legacy compatibility copy and `.agents/skills/` is preferred for shared skill updates.

- [ ] **Step 7: Commit**

Run:

```bash
git add AGENTS.md CLAUDE.md .agents/skills docs/superpowers/plans/2026-06-06-agent-setup-migration.md
git commit -m "docs: migrate repo skills for codex"
```

Expected: commit succeeds.

---

### Task 3: Move Hooks To Shared Scripts

**Files:**
- Create: `scripts/agent-hooks/branch-protection.sh`
- Create: `scripts/agent-hooks/format-check.sh`
- Create: `scripts/agent-hooks/type-check.sh`
- Create: `scripts/agent-hooks/test-runner.sh`
- Modify: `.claude/hooks/branch-protection.sh`
- Modify: `.claude/hooks/format-check.sh`
- Modify: `.claude/hooks/type-check.sh`
- Modify: `.claude/hooks/test-runner.sh`
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Create `scripts/agent-hooks/branch-protection.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

current_branch="$(git branch --show-current)"

if [ "$current_branch" = "master" ] || [ "$current_branch" = "main" ]; then
  echo "Cannot edit files on $current_branch. Create a feature branch first." >&2
  exit 2
fi
```

- [ ] **Step 2: Create `scripts/agent-hooks/format-check.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

file_path="${1:-${CLAUDE_TOOL_INPUT_FILE_PATH:-}}"

if [ -z "$file_path" ]; then
  exit 0
fi

if [[ ! "$file_path" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

if [ ! -f "$file_path" ]; then
  exit 0
fi

pnpm exec eslint "$file_path"
```

- [ ] **Step 3: Create `scripts/agent-hooks/type-check.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

file_path="${1:-${CLAUDE_TOOL_INPUT_FILE_PATH:-}}"

if [ -n "$file_path" ]; then
  if [[ ! "$file_path" =~ \.(ts|tsx)$ ]]; then
    exit 0
  fi

  if [ ! -f "$file_path" ]; then
    exit 0
  fi
fi

npx tsc --noEmit
```

- [ ] **Step 4: Create `scripts/agent-hooks/test-runner.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

file_path="${1:-${CLAUDE_TOOL_INPUT_FILE_PATH:-}}"

if [ -z "$file_path" ]; then
  exit 0
fi

if [[ ! "$file_path" =~ \.test\.(ts|tsx)$ ]]; then
  exit 0
fi

if [ ! -f "$file_path" ]; then
  exit 0
fi

pnpm test "$file_path" --passWithNoTests
```

- [ ] **Step 5: Fix ESLint flat config composition if needed**

If `pnpm exec eslint <file>` crashes before reporting file-level lint results, update `eslint.config.mjs` so Next's native flat configs are imported directly and `FlatCompat` is only used for legacy-style configs.

- [ ] **Step 6: Make shared scripts executable**

Run:

```bash
chmod +x scripts/agent-hooks/*.sh
```

Expected: command exits 0.

- [ ] **Step 7: Replace each Claude hook with a wrapper**

Use this pattern for each file:

```bash
#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
"$repo_root/scripts/agent-hooks/<script-name>.sh" "${CLAUDE_TOOL_INPUT_FILE_PATH:-}" || true
```

For `branch-protection.sh`, omit the file path argument and do not add `|| true`:

```bash
#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
"$repo_root/scripts/agent-hooks/branch-protection.sh"
```

- [ ] **Step 8: Manually verify hooks**

Run:

```bash
scripts/agent-hooks/branch-protection.sh
scripts/agent-hooks/format-check.sh package.json
scripts/agent-hooks/format-check.sh no-such.ts
scripts/agent-hooks/test-runner.sh no-such.test.ts
scripts/agent-hooks/type-check.sh no-such.ts
scripts/agent-hooks/type-check.sh app/page.tsx
scripts/agent-hooks/test-runner.sh app/page.tsx
```

Expected: branch protection exits 0 on a feature branch, format check exits 0 for non-JS/TS or valid files, type check exits 0 only when the project is type-clean, and test runner exits 0 for non-test files.

- [ ] **Step 9: Commit**

Run:

```bash
git add scripts/agent-hooks .claude/hooks eslint.config.mjs docs/superpowers/plans/2026-06-06-agent-setup-migration.md
git commit -m "chore: share agent hook scripts"
```

Expected: commit succeeds.

---

### Task 4: Add Codex Project Configuration And Hooks

**Files:**
- Create: `.codex/config.toml`
- Create: `.codex/hooks.json`
- Modify: `.gitignore`

- [ ] **Step 0: Keep hooks under `.codex`, not `.agents`**

Codex uses `.agents/skills` for repo-scoped skills. Do not put lifecycle hooks under `.agents` or `.agent`.

Codex hook sources are:

- `~/.codex/hooks.json`
- `~/.codex/config.toml` inline `[hooks]`
- `$REPO_ROOT/.codex/hooks.json`
- `$REPO_ROOT/.codex/config.toml` inline `[hooks]`
- enabled plugins that bundle lifecycle hook configuration

For this repo, use `$REPO_ROOT/.codex/hooks.json` so hook wiring is project-scoped and separate from reusable skill content in `.agents/skills`.

- [ ] **Step 1: Create `.codex/config.toml`**

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"
web_search = "cached"

[features]
hooks = true
multi_agent = true

[agents]
max_threads = 6
max_depth = 1
```

- [ ] **Step 2: Create `.codex/hooks.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|apply_patch",
        "hooks": [
          {
            "type": "command",
            "command": "\"$(git rev-parse --show-toplevel)\"/scripts/agent-hooks/branch-protection.sh",
            "timeout": 5,
            "statusMessage": "Checking branch protection"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|apply_patch",
        "hooks": [
          {
            "type": "command",
            "command": "\"$(git rev-parse --show-toplevel)\"/scripts/agent-hooks/type-check.sh",
            "timeout": 90,
            "statusMessage": "Checking TypeScript"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pnpm lint",
            "timeout": 120,
            "statusMessage": "Running lint before stop"
          }
        ]
      }
    ]
  }
}
```

Note: Codex hook payload file-path handling can differ from Claude. Keep the first Codex hook pass coarse-grained and rely on explicit user/agent verification commands from `AGENTS.md` until payload parsing is validated in this repo.

- [ ] **Step 3: Add local Codex ignores**

Append to `.gitignore`:

```gitignore
# codex local runtime
.codex-log/
.codex/session*.jsonl
.codex/*.local.*
```

Do not ignore `.codex/config.toml`, `.codex/hooks.json`, or `.codex/agents/`.

- [ ] **Step 4: Verify Codex hook JSON syntax**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('.codex/hooks.json', 'utf8')); console.log('ok')"
```

Expected:

```text
ok
```

- [ ] **Step 5: Commit**

Run:

```bash
git add .codex/config.toml .codex/hooks.json .gitignore
git commit -m "chore: add codex project configuration"
```

Expected: commit succeeds.

---

### Task 5: Add Codex Custom Reviewer Agents

**Files:**
- Create: `.codex/agents/security-reviewer.toml`
- Create: `.codex/agents/database-reviewer.toml`

- [ ] **Step 1: Create `.codex/agents/security-reviewer.toml`**

```toml
name = "security-reviewer"
description = "Review auth, RBAC, input validation, realtime message validation, secrets, XSS, SQL injection, and server action security."
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Review code for security risks in the ree-board project.

Prioritize findings that can cause unauthorized access, guest mutation, data leaks, secret exposure, unsafe input handling, unsafe realtime processing, XSS, SQL injection, or missing authorization.

Require these rules:
- Every server action must use actionWithAuth or rbacWithAuth.
- Guest users must be read-only.
- User input and Ably message payloads must be validated with Zod before use.
- Server-only secrets must not be exposed through NEXT_PUBLIC variables or client components.
- Raw SQL must use parameterized Drizzle sql templates.
- User-generated markdown must be sanitized with rehype-sanitize.

Report findings first, ordered by severity, with file and line references. If no issues are found, say that and list residual test gaps.
"""
nickname_candidates = ["Security Reviewer", "RBAC Reviewer", "Validation Reviewer"]
```

- [ ] **Step 2: Create `.codex/agents/database-reviewer.toml`**

```toml
name = "database-reviewer"
description = "Review Drizzle schema changes, migrations, indexes, relations, transactions, Turso SQLite safety, and query performance."
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
Review database-related changes in the ree-board project.

Prioritize findings that can cause data loss, broken migrations, missing indexes, invalid relations, unsafe schema changes, slow queries, broken Turso SQLite compatibility, or missing transaction boundaries.

Require these rules:
- Tables use Nano ID primary keys.
- Foreign keys have appropriate references and deletion behavior.
- Foreign keys and frequently filtered columns are indexed.
- Drizzle relations exist for foreign keys.
- Migrations are generated, reviewed, and tested locally before production push.
- Multi-table writes use transactions.
- Repeated queries use prepared statements where practical.

Report findings first, ordered by severity, with file and line references. If no issues are found, say that and list residual migration or test risk.
"""
nickname_candidates = ["Database Reviewer", "Migration Reviewer", "Query Reviewer"]
```

- [ ] **Step 3: Verify TOML parses with available tooling**

Run:

```bash
python3 - <<'PY'
import sys

try:
    import tomllib
except ImportError:
    print("Python 3.11+ with tomllib is required for this check", file=sys.stderr)
    sys.exit(1)

required = {
    "name": str,
    "description": str,
    "developer_instructions": str,
}

for toml_file in [
    ".codex/agents/security-reviewer.toml",
    ".codex/agents/database-reviewer.toml",
]:
    with open(toml_file, "rb") as file:
        config = tomllib.load(file)

    for key, expected_type in required.items():
        if not isinstance(config.get(key), expected_type):
            print(f"{toml_file}: missing or invalid {key}", file=sys.stderr)
            sys.exit(1)

print("ok")
PY
```

Expected:

```text
ok
```

- [ ] **Step 4: Commit**

Run:

```bash
git add .codex/agents
git commit -m "chore: add codex reviewer agents"
```

Expected: commit succeeds.

---

### Task 6: Add Agent Setup Documentation

**Files:**
- Create: `docs/AGENT_SETUP.md`

- [ ] **Step 1: Create `docs/AGENT_SETUP.md`**

```md
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
```

- [ ] **Step 2: Commit**

Run:

```bash
git add docs/AGENT_SETUP.md
git commit -m "docs: document agent setup"
```

Expected: commit succeeds.

---

### Task 7: Final Verification

**Files:**
- Verify all files from Tasks 1-6.

- [ ] **Step 1: Check expected files exist**

Run:

```bash
test -f AGENTS.md
test -f CLAUDE.md
test -f .codex/config.toml
test -f .codex/hooks.json
test -f .codex/agents/security-reviewer.toml
test -f .codex/agents/database-reviewer.toml
test -f docs/AGENT_SETUP.md
find .agents/skills -name SKILL.md | wc -l
```

Expected final line:

```text
6
```

- [ ] **Step 2: Check no migrated skill mentions Claude**

Run:

```bash
grep -RIn "Claude\\|claude\\|CLAUDE" .agents/skills
grep -RInE '"went_well"|'\'went_well\''|"to_improve"|'\'to_improve\''|"action_items"|'\'action_items\''|post:create|post:update|post:delete|post:move|post:vote|member:join|processPostUpdate|Kinde|kinde|mockKinde|getKinde|model: sonnet|model: opus|BoardMessageSchema|message\.data\.timestamp|Always Include Timestamp' .agents/skills
```

Expected: no output.

- [ ] **Step 3: Run project checks**

Run:

```bash
pnpm lint
npx tsc --noEmit
pnpm test
```

Expected: all commands exit 0.

- [ ] **Step 4: Ask Codex to verify loaded guidance**

Run from the repo root in a new Codex session:

```bash
codex --ask-for-approval never "Summarize the active repo instructions, repo skills, custom agents, and hooks you can see."
```

Expected: Codex mentions `AGENTS.md`, `.agents/skills`, `.codex/agents`, and `.codex/hooks.json`.

- [ ] **Step 5: Final commit if verification required fixes**

Run:

```bash
git add AGENTS.md CLAUDE.md .agents .codex scripts/agent-hooks docs/AGENT_SETUP.md .gitignore .claude/hooks docs/superpowers/plans/2026-06-06-agent-setup-migration.md
git commit -m "chore: finish codex agent setup migration"
```

Expected: commit succeeds only if final verification required changes after earlier commits.

---

## Self-Review

- Spec coverage: The plan reviews the existing Claude setup and maps instructions, settings, hooks, skills, and reviewer agents to Codex and agent-neutral destinations.
- Placeholder scan: The plan avoids placeholder tasks and gives exact target files, concrete file content, commands, and expected results.
- Type consistency: Codex skill paths use `.agents/skills`; Codex project configuration uses `.codex/config.toml`; Codex hooks use `.codex/hooks.json`; custom agents use `.codex/agents/*.toml`.
