# errors Types Explanation

## What is errors Types?

`errors` types is a **TypeScript type definitions file** that defines all error-related types and interfaces. It provides type safety for API errors, validation errors, and HTTP errors.

## Key Features

### 1. **Error Response Types**
- API error response
- Validation error response
- HTTP error response
- Axios error response

### 2. **Type Safety**
- TypeScript interfaces
- Consistent structure
- Error handling

### 3. **Express-Validator Support**
- Validation error format
- Array of errors
- Message extraction

## Step-by-Step Breakdown

### API Error Response

```typescript
export interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}
```

**What this does:**
- Defines standard API error structure
- Nested response structure
- Optional message
- Used for error handling

### Validation Error

```typescript
export interface ValidationError {
  msg?: string;
  message?: string;
}
```

**What this does:**
- Defines validation error structure
- Express-validator format
- Supports both msg and message
- Used for form validation

### Validation Error Response

```typescript
export interface ValidationErrorResponse {
  response?: {
    data?: {
      message?: string;
      errors?: ValidationError[];
    };
  };
}
```

**What this does:**
- Defines validation error response
- Array of validation errors
- Optional main message
- Used for form validation

### HTTP Error Response

```typescript
export interface HttpErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}
```

**What this does:**
- Defines HTTP error response
- Includes status code
- Optional message
- Used for status-based handling

### Axios Error Response

```typescript
export interface AxiosErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  code?: string;
  message?: string;
}
```

**What this does:**
- Defines Axios error response
- Includes code and message
- Status code
- Used for Axios error handling

## Usage Examples

### API Error

```typescript
import type { ApiErrorResponse } from '@/types/errors';

try {
  // API call
} catch (error) {
  const apiError = error as ApiErrorResponse;
  const message = apiError.response?.data?.message;
}
```

### Validation Error

```typescript
import type { ValidationErrorResponse } from '@/types/errors';

const error = error as ValidationErrorResponse;
if (error.response?.data?.errors) {
  error.response.data.errors.forEach(err => {
    console.log(err.msg || err.message);
  });
}
```

### HTTP Error

```typescript
import type { HttpErrorResponse } from '@/types/errors';

const error = error as HttpErrorResponse;
if (error.response?.status === 401) {
  // Handle unauthorized
}
```

## Summary

**errors types** is the error type definitions file that:
1. ✅ Defines error response types
2. ✅ Validation error types
3. ✅ HTTP error types
4. ✅ Type safety
5. ✅ Consistent structure

It's the "error types" - ensuring type safety for errors!

