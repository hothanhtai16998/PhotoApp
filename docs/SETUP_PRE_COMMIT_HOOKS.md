# Setting Up Pre-commit Hooks

This guide will help you set up pre-commit hooks to catch TypeScript and linting errors before they're committed.

## Quick Setup

### Step 1: Install Dependencies

```bash
cd frontend
npm install --save-dev husky lint-staged
```

### Step 2: Initialize Husky

```bash
npx husky init
```

This will:
- Create a `.husky` directory
- Add a `prepare` script to `package.json`
- Create a sample pre-commit hook

### Step 3: Configure lint-staged

Add to `frontend/package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

### Step 4: Update Pre-commit Hook

Edit `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged (auto-fixes and checks staged files)
npx lint-staged

# Run type check (catches TypeScript errors)
npm run type-check
```

### Step 5: Make Hook Executable (Linux/Mac)

```bash
chmod +x .husky/pre-commit
```

## What This Does

1. **Before every commit:**
   - Runs ESLint with auto-fix on staged TypeScript files
   - Formats code with Prettier
   - Runs TypeScript type checking
   - **Prevents commit if any check fails**

2. **Benefits:**
   - Catches type errors before commit
   - Auto-fixes linting issues
   - Ensures consistent code style
   - Prevents broken builds

## Manual Commands

You can also run these manually:

```bash
# Type check only
npm run type-check

# Lint with auto-fix
npm run lint:fix

# Both
npm run type-check && npm run lint:fix
```

## Bypassing Hooks (Use Sparingly!)

If you absolutely need to bypass hooks (not recommended):

```bash
git commit --no-verify -m "your message"
```

## Troubleshooting

### Hook not running?
- Check if `.husky/pre-commit` exists and is executable
- Verify `prepare` script is in `package.json`
- Run `npm run prepare` manually

### Type check too slow?
- Consider running type-check only on changed files
- Or move it to CI/CD instead of pre-commit

### Conflicts with other tools?
- Adjust the hook order
- Some tools (like commitizen) may need special configuration

