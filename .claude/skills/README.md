# Claude Code Skills

This directory contains domain-specific knowledge documents that help Claude understand the ree-board project's technical stack, patterns, and best practices.

## What are Skills?

Skills are specialized knowledge modules that Claude can reference when working on specific types of tasks. Each skill contains:

- **Activation Triggers:** Keywords and patterns that activate the skill
- **Core Patterns:** Best practices with code examples
- **Anti-Patterns:** Common mistakes to avoid
- **Project Context:** References to actual files in the codebase

## Available Skills

### Core Framework Skills

#### [Next.js App Router](nextjs-app-router/SKILL.md)

**Triggers:** server components, client components, server actions, app router, Next.js 16

**Use for:** Building pages, routes, layouts, metadata, server actions, and Next.js-specific patterns

#### [Drizzle ORM](drizzle-patterns/SKILL.md)

**Triggers:** database, schema, migration, Drizzle, Turso, SQL, queries

**Use for:** Database schema design, migrations, queries, transactions, and Turso operations

### Security & State Management

#### [RBAC Security](rbac-security/SKILL.md)

**Triggers:** authentication, authorization, security, RBAC, roles, permissions

**Use for:** Implementing authentication, role-based access control, input validation, and security patterns

#### [Signal State Management](signal-state-management/SKILL.md)

**Triggers:** state management, signals, Preact, reactive state, computed values

**Use for:** Managing application state with Preact Signals, reactive patterns, and state updates

### Real-time & Testing

#### [Ably Real-time](ably-realtime/SKILL.md)

**Triggers:** real-time, WebSocket, Ably, channels, messaging, collaboration

**Use for:** Real-time features, message validation, channel management, and collaborative editing

#### [Testing Patterns](testing-patterns/SKILL.md)

**Triggers:** testing, Jest, test, mock, unit test, integration test

**Use for:** Writing tests, mocking strategies, test organization, and test-driven development

## How Skills Are Activated

Skills use **semantic matching** on their description field. Claude automatically activates relevant skills based on:

1. **Keywords in your request:** Mentioning "authentication" activates rbac-security
2. **File patterns:** Editing `db/schema.ts` activates drizzle-patterns
3. **Context awareness:** Building a real-time feature activates ably-realtime
4. **Task types:** Writing tests activates testing-patterns

## Skill Combinations

Complex tasks often require multiple skills working together:

### Adding a New Feature

1. **nextjs-app-router** → Plan routes and components
2. **rbac-security** → Add authentication
3. **drizzle-patterns** → Design database schema
4. **signal-state-management** → Manage client state
5. **testing-patterns** → Write tests

### Database Changes

1. **drizzle-patterns** → Modify schema
2. **rbac-security** → Add access control
3. **testing-patterns** → Test queries

### Real-time Features

1. **ably-realtime** → Set up channels
2. **signal-state-management** → Reactive UI updates
3. **rbac-security** → Validate messages
4. **testing-patterns** → Test message flow

## Skill Structure

Each `SKILL.md` file follows this format:

```markdown
---
name: skill-identifier
description: Semantic matching keywords and use cases
model: sonnet  # optional
---

# Skill Name

## When to Use This Skill
Activation conditions and contexts

## Core Patterns
Best practices with code examples

## Anti-Patterns
Common mistakes to avoid

## Integration with Other Skills
Related skills and coordination

## Project-Specific Context
References to actual codebase files
```

## Adding New Skills

When adding a new skill:

1. Create directory: `.claude/skills/skill-name/`
2. Create `SKILL.md` with proper frontmatter
3. Include semantic keywords in description
4. Provide concrete code examples
5. Reference actual project files
6. Update this README

## Maintenance

Skills should be updated when:

- New patterns emerge in the codebase
- Technologies are upgraded (Next.js 15 → 16)
- Best practices evolve
- Anti-patterns are discovered
- Project architecture changes

## Related Documentation

- [Hooks Documentation](../settings.md) - Automation hooks
- [Agents Documentation](../agents/) - Specialized reviewers
- [Project Guidelines](../../CLAUDE.md) - Comprehensive development guide

---

**Last Updated:** 2026-01-10
**Skills Count:** 6
**Maintainer:** Project team
