# Type Safety & Bug Prevention Guide

## Overview
This guide explains how to prevent common TypeScript and code quality issues that can cause build failures.

## Issues We Fixed

### 1. **RefObject Type Mismatches**
**Problem:** `useRef<HTMLDivElement>(null)` creates `RefObject<HTMLDivElement | null>`, but interfaces expected `RefObject<HTMLDivElement>`.

**Root Cause:** TypeScript's `useRef` always includes `null` in the type when initialized with `null`.

**Prevention:**
- Always use `RefObject<T | null>` in interfaces when accepting refs
- Create a type alias for consistency:
  ```typescript
  type DivRef = React.RefObject<HTMLDivElement | null>;
  ```

### 2. **Unused Parameters**
**Problem:** Parameters declared but never used in function bodies.

**Prevention:**
- TypeScript already has `noUnusedParameters: true` in `tsconfig.app.json` ✅
- Prefix intentionally unused parameters with `_` (e.g., `_userId`)
- Use TypeScript's `@ts-expect-error` with explanation if truly needed

### 3. **Orphaned Code**
**Problem:** Leftover code from refactoring that wasn't cleaned up.

**Prevention:**
- Use IDE features to detect unused code
- Run linters before committing
- Use pre-commit hooks (see below)

## Prevention Strategies

### 1. Enhanced TypeScript Configuration

Your current `tsconfig.app.json` is already quite strict! ✅ But we can add:

```json
{
  "compilerOptions": {
    // ... existing options ...
    
    // Additional strict checks
    "noUnusedLocals": true,           // ✅ Already enabled
    "noUnusedParameters": true,       // ✅ Already enabled
    "noImplicitReturns": true,         // ⚠️ Add this
    "noPropertyAccessFromIndexSignature": true,  // ⚠️ Add this
    "exactOptionalPropertyTypes": true // ⚠️ Consider adding
  }
}
```

### 2. Enhanced ESLint Rules

Add more comprehensive rules to catch issues early:

```javascript
// eslint.config.js
rules: {
  // ... existing rules ...
  
  // TypeScript-specific
  '@typescript-eslint/no-unused-vars': ['error', { 
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_'
  }],
  '@typescript-eslint/explicit-function-return-type': 'warn',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/prefer-nullish-coalescing': 'warn',
  '@typescript-eslint/prefer-optional-chain': 'warn',
  
  // Code quality
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'prefer-const': 'error',
  'no-var': 'error',
}
```

### 3. Pre-commit Hooks (Husky + lint-staged)

Install and configure to catch issues before commit:

```bash
npm install --save-dev husky lint-staged
```

**package.json:**
```json
{
  "scripts": {
    "prepare": "husky install",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

**Setup:**
```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
echo "npm run type-check" >> .husky/pre-commit
```

### 4. CI/CD Pipeline Checks

Add to your CI/CD (GitHub Actions, etc.):

```yaml
# .github/workflows/ci.yml
- name: Type Check
  run: npm run type-check

- name: Lint
  run: npm run lint

- name: Build
  run: npm run build
```

### 5. Type Safety Best Practices

#### A. Consistent Ref Types
Create shared types:

```typescript
// src/types/refs.ts
export type DivRef = React.RefObject<HTMLDivElement | null>;
export type ButtonRef = React.RefObject<HTMLButtonElement | null>;
export type InputRef = React.RefObject<HTMLInputElement | null>;
```

#### B. Type Guards for Nullable Refs
```typescript
function useRefWithGuard<T>(initialValue: T | null) {
  const ref = useRef<T>(initialValue);
  
  return {
    ref,
    get current() {
      if (!ref.current) {
        throw new Error('Ref is not attached');
      }
      return ref.current;
    }
  };
}
```

#### C. Explicit Return Types
Always specify return types for functions:

```typescript
// ❌ Bad
function fetchData() {
  return api.get('/data');
}

// ✅ Good
function fetchData(): Promise<DataResponse> {
  return api.get('/data');
}
```

### 6. IDE Configuration

#### VS Code Settings (.vscode/settings.json)
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### 7. Regular Code Audits

Run these commands regularly:

```bash
# Find unused exports
npx ts-prune

# Find duplicate code
npx jscpd src/

# Type check without building
npm run type-check

# Lint with auto-fix
npm run lint -- --fix
```

### 8. Refactoring Checklist

When refactoring:
- [ ] Run `npm run type-check` before and after
- [ ] Run `npm run lint` and fix all issues
- [ ] Search for orphaned code (unused imports, dead code)
- [ ] Update all related type definitions
- [ ] Test the build: `npm run build`
- [ ] Check for unused parameters/variables

## Quick Reference: Common TypeScript Gotchas

### 1. useRef Types
```typescript
// ❌ Wrong
const ref = useRef<HTMLDivElement>(null);
type Ref = React.RefObject<HTMLDivElement>;

// ✅ Correct
const ref = useRef<HTMLDivElement>(null);
type Ref = React.RefObject<HTMLDivElement | null>;
```

### 2. Optional Parameters
```typescript
// ❌ Wrong (unused parameter)
function fetch(userId: string, signal?: AbortSignal) {
  return api.get('/data', { signal });
}

// ✅ Correct (prefix with _)
function fetch(_userId: string, signal?: AbortSignal) {
  return api.get('/data', { signal });
}
```

### 3. Array Methods
```typescript
// ❌ Wrong (might be undefined)
const first = array[0].name;

// ✅ Correct
const first = array[0]?.name;
// or
if (array[0]) {
  const first = array[0].name;
}
```

## Summary

Your project already has:
- ✅ Strict TypeScript mode
- ✅ Unused parameter detection
- ✅ ESLint configured

**Recommended additions:**
1. ⚠️ Pre-commit hooks (Husky + lint-staged)
2. ⚠️ Enhanced ESLint rules
3. ⚠️ CI/CD type checking
4. ⚠️ Shared type definitions for refs
5. ⚠️ Regular code audits

These will catch 90%+ of these issues before they reach production!

