# Contributing to StellarAid Frontend

Thank you for your interest in contributing to StellarAid! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Code Review Policy](#code-review-policy)
- [Issue Guidelines](#issue-guidelines)

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/Stellar-Aid-Frontend.git
   cd Stellar-Aid-Frontend
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
5. **Set up your environment**:
   ```bash
   cp .env.example .env.local
   ```

## Development Workflow

```bash
# Start the dev server
npm run dev

# Run linting
npm run lint

# Build for production (to verify)
npm run build
```

### Project Structure

- `src/app/` — Next.js App Router pages
- `src/components/` — Reusable React components
- `src/components/ui/` — Shadcn base components
- `src/hooks/` — Custom React hooks
- `src/lib/` — Utilities and client libraries

## Code Standards

- **TypeScript**: All code must be written in TypeScript with strict mode enabled
- **Linting**: Run `npm run lint` before submitting. All ESLint rules must pass.
- **Components**: Use Shadcn/Radix UI patterns. All interactive components must be keyboard-accessible.
- **Naming**: Use `PascalCase` for components, `camelCase` for functions and variables
- **Imports**: Use the `@/` alias for project imports
- **Comments**: Add JSDoc comments to exported functions and components
- **Security**: Never expose tokens in URLs or query parameters. Always use `Authorization` headers.

## Pull Request Process

1. Ensure your branch is up to date with `main`
2. Write a clear PR title and description explaining **what** and **why**
3. Link any related issues
4. Ensure `npm run lint` and `npm run build` pass
5. Request review from `@Trovic1`

## Code Review Policy

- **All source code** changes in `src/` require review from **@Trovic1** (enforced via `.github/CODEOWNERS`)
- Reviews focus on: correctness, security, accessibility, and consistency with existing patterns
- Maintainers may request changes or suggest alternative approaches

## Issue Guidelines

- Check existing issues before creating new ones
- Use the provided labels for categorization:
  - `area:*` — Module area (e.g., `area:wallet-auth`, `area:dashboard`)
  - `stack:*` — Technology (e.g., `stack:nextjs`, `stack:typescript`)
  - `type:*` — Kind of work (e.g., `type:refactor`, `type:test`)
  - `wave-*` — Complexity level for Wave scoring
- Include clear reproduction steps for bugs
- Reference specific files and line numbers when possible

---

Thank you for helping make transparent funding accessible to everyone! 🌍
