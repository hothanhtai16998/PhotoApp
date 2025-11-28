# category Types Explanation

## What is category Types?

`category` types is a **TypeScript type definitions file** that defines the Category interface. It provides type safety for image categories.

## Key Features

### 1. **Category Interface**
- Complete category structure
- Optional fields
- Type-safe

### 2. **Simple Structure**
- ID, name, description
- Minimal interface
- Easy to use

## Step-by-Step Breakdown

### Category Interface

```typescript
export interface Category {
  _id: string;
  name: string;
  description?: string;
}
```

**What this does:**
- Defines category structure
- Required ID and name
- Optional description
- Used throughout app

## Usage Examples

### Category Type

```typescript
import type { Category } from '@/types/category';

const category: Category = {
  _id: '123',
  name: 'Nature',
  description: 'Nature photography',
};
```

### Category Array

```typescript
const categories: Category[] = [
  { _id: '1', name: 'Nature' },
  { _id: '2', name: 'Portrait' },
  { _id: '3', name: 'Architecture' },
];
```

## Summary

**category types** is the category type definitions file that:
1. ✅ Defines Category interface
2. ✅ Type safety
3. ✅ Simple structure
4. ✅ Easy to use

It's the "category types" - ensuring type safety for categories!

