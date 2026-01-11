# Claude Code Settings Documentation

This document explains the hooks and automation configured for the ree-board project.

## Hooks Overview

Claude Code hooks automate common development tasks and maintain code quality standards. The project uses two types of hooks:

- **PreToolUse**: Runs before file modifications (can block operations)
- **PostToolUse**: Runs after file modifications (provides feedback)

All hooks are implemented as shell scripts in `.claude/hooks/` and configured in `.claude/settings.json`.

## Hook Configuration Structure

Hooks use the following format in `settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/script-name.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

**Key Fields:**
- `matcher`: Tool names that trigger the hook (pipe-separated)
- `type`: Always `"command"` for shell scripts
- `command`: Path to script (uses `$CLAUDE_PROJECT_DIR` for project root)
- `timeout`: Maximum execution time in **seconds**

## Environment Variables

Claude Code provides these environment variables to hooks:

- `$CLAUDE_TOOL_INPUT_FILE_PATH` - Path to file being edited
- `$CLAUDE_FILE_PATHS` - All file paths affected
- `$CLAUDE_TOOL_NAME` - Name of the tool being used
- `$CLAUDE_WORKING_DIR` - Current working directory
- `$CLAUDE_PROJECT_DIR` - Project root directory

## PreToolUse Hooks

### Branch Protection

**Script:** `.claude/hooks/branch-protection.sh`

**Purpose:** Prevents accidental modifications to the master branch

**Trigger:** Before any `Edit` or `Write` tool operation

**Behavior:** Blocks the operation if the current branch is `master`

**Exit Codes:**
- `0`: Success (not on master branch, operation proceeds)
- `2`: Blocking (on master branch, operation prevented)

**JSON Response:**
```json
{"block": true, "message": "Cannot edit files on master branch. Create a feature branch first."}
```

**How to Resolve:**
```bash
git checkout -b feature/your-feature-name
```

## PostToolUse Hooks

All PostToolUse hooks are **non-blocking** - they provide feedback but don't prevent operations from completing.

### 1. Format Check (ESLint)

**Script:** `.claude/hooks/format-check.sh`

**Purpose:** Validates code formatting and linting standards

**Trigger:** After editing `.ts`, `.tsx`, `.js`, or `.jsx` files

**Command:** `pnpm exec eslint $CLAUDE_TOOL_INPUT_FILE_PATH`

**Timeout:** 30 seconds

**JSON Responses:**
```json
// Success
{"feedback": "✅ Linting passed.", "suppressOutput": true}

// Failure
{"feedback": "⚠️ Linting issues found. Run \"pnpm lint\" to see details."}
```

**Manual Fix:**
```bash
pnpm lint
```

### 2. Type Check (TypeScript)

**Script:** `.claude/hooks/type-check.sh`

**Purpose:** Validates TypeScript type correctness across the project

**Trigger:** After editing `.ts` or `.tsx` files

**Command:** `npx tsc --noEmit`

**Timeout:** 60 seconds

**JSON Responses:**
```json
// Success
{"feedback": "✅ No TypeScript errors.", "suppressOutput": true}

// Failure (shows first 30 lines of errors)
{"feedback": "⚠️ TypeScript errors found:"}
```

**Manual Fix:**
```bash
npx tsc --noEmit
```

Review error output and fix type issues in your code.

### 3. Test Runner (Jest)

**Script:** `.claude/hooks/test-runner.sh`

**Purpose:** Automatically runs tests for modified test files

**Trigger:** After editing `.test.ts` or `.test.tsx` files

**Command:** `pnpm test $CLAUDE_TOOL_INPUT_FILE_PATH --passWithNoTests`

**Timeout:** 90 seconds

**JSON Responses:**
```json
// Success
{"feedback": "✅ Tests passed."}

// Failure
{"feedback": "❌ Tests failed. See output above."}
```

**Manual Fix:**
```bash
pnpm test <file-path>
```

## Hook Response Format

Hooks communicate using JSON responses and exit codes:

**Exit Codes:**
- `0`: Success (operation completed)
- `2`: Blocking error (PreToolUse only, prevents operation)
- Other codes: Non-blocking error

**JSON Format:**
```json
{
  "feedback": "Message to display",
  "suppressOutput": true,  // Optional: hide verbose output
  "block": true,          // PreToolUse only: prevents operation
  "message": "Blocking reason"  // PreToolUse only
}
```

**Output Streams:**
- Stdout: Success messages (exit code 0)
- Stderr: Error messages (exit code 2 or failures)

## Modifying Hooks

### Edit a Hook Script

Hooks are regular bash scripts in `.claude/hooks/`:

1. Edit the script file directly
2. Use `$CLAUDE_TOOL_INPUT_FILE_PATH` for file path
3. Return JSON for feedback
4. Set appropriate exit code

Example:
```bash
#!/bin/bash
FILE_PATH="$CLAUDE_TOOL_INPUT_FILE_PATH"

# Your logic here

if [ success ]; then
  echo '{"feedback": "✅ Success", "suppressOutput": true}'
  exit 0
else
  echo '{"feedback": "❌ Failed"}' >&2
  exit 1
fi
```

### Add a New Hook

1. Create script in `.claude/hooks/`
2. Make it executable: `chmod +x .claude/hooks/your-hook.sh`
3. Add configuration to `.claude/settings.json`
4. Test the hook

## Disabling Hooks

**Temporarily disable a specific hook:**

Comment out the hook in `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      // {
      //   "matcher": "Edit|Write",
      //   "hooks": [...]
      // }
    ]
  }
}
```

**Disable all hooks:**

Remove or rename `.claude/settings.json`

**Note:** Branch protection is a safety feature - only disable it if you need to modify the master branch directly.

## Troubleshooting

### Hook Not Running

Verify:
1. Script has execute permissions: `chmod +x .claude/hooks/*.sh`
2. Script path is correct in `settings.json`
3. `matcher` includes the right tools (`Edit|Write`)
4. File pattern matches (if using file filtering)

### Hook Timeout Errors

If a hook times out:
- Increase `timeout` value in `settings.json` (in seconds)
- Optimize the hook script
- Check for hanging processes

### Environment Variables Not Available

Claude Code provides these variables automatically:
- `$CLAUDE_TOOL_INPUT_FILE_PATH` - The file being modified
- `$CLAUDE_PROJECT_DIR` - Project root
- Others listed in "Environment Variables" section above

If a variable is undefined, check Claude Code version or documentation.

### JSON Parse Errors

Ensure JSON is properly formatted:
- Use single quotes for bash strings containing JSON
- Escape double quotes in JSON: `\"`
- Test JSON with: `echo '{"key": "value"}' | jq`

Example:
```bash
# ✅ Correct
echo '{"feedback": "Success"}'

# ❌ Wrong
echo {"feedback": "Success"}
```

## Best Practices

1. **Keep hooks fast**: Use timeouts wisely (30-90s max)
2. **Provide clear feedback**: Use descriptive JSON messages
3. **Use suppressOutput**: Hide verbose output for successful operations
4. **Return JSON**: Structured feedback is better than plain text
5. **Test hooks**: Run scripts manually before relying on them
6. **Use environment variables**: Always use `$CLAUDE_TOOL_INPUT_FILE_PATH`

## Related Documentation

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [CLAUDE.md](../../CLAUDE.md) - Project development guidelines
- [Skills Documentation](.claude/skills/README.md) - Domain knowledge skills
- [Agents Documentation](.claude/agents/) - Specialized code reviewers

---

**Last Updated:** 2026-01-11
**Hook Scripts:** `.claude/hooks/`
**Configuration:** `.claude/settings.json`