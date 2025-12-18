# TypeScript Boilerplate

Minimal TypeScript setup with strict config, testing, and linting.

## Requirements

- Node.js 24.11.1 (see `.nvmrc`)
- pnpm

## Scripts

```bash
pnpm start          # Run dev server with tsx
pnpm build          # Build for production
pnpm clean          # Remove dist folder
pnpm test           # Run tests
pnpm test:watch     # Run tests in watch mode
pnpm lint           # Check code quality
pnpm lint:fix       # Fix lint issues
pnpm format         # Check formatting
pnpm format:fix   # Format code with Prettier
```

## Stack

- TypeScript 5.9.3 (strict mode)
- tsx - dev runtime
- Jest + ts-jest - testing
- ESLint + Prettier - linting & formatting
