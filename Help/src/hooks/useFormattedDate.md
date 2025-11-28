# useFormattedDate Hook Explanation

## What is useFormattedDate?

`useFormattedDate` is a **custom React hook** that formats dates consistently across the application. It uses `Intl.DateTimeFormat` for localization and provides various formatting options.

## Key Features

### 1. **Consistent Formatting**
- Same format across app
- Localized (default: Vietnamese)
- Multiple format options

### 2. **Flexible Input**
- Accepts Date objects
- Accepts date strings
- Handles null/undefined

### 3. **Format Options**
- Short, medium, long, full
- Optional time inclusion
- Custom locale

## Step-by-Step Breakdown

### Hook Structure

```typescript
export function useFormattedDate(
  date: string | Date | null | undefined,
  options: UseFormattedDateOptions = {}
): string | null {
  const {
    locale = 'vi-VN',
    format = 'long',
    includeTime = false,
  } = options;

  return useMemo(() => {
    // Formatting logic
  }, [date, locale, format, includeTime]);
}
```

**What this does:**
- Accepts date in multiple formats
- Defaults to Vietnamese locale
- Uses `useMemo` for performance
- Returns formatted string or null

### Date Validation

```typescript
if (!date) return null;

try {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return null;
  }
  // Format...
} catch (error) {
  console.error('Error formatting date:', error);
  return null;
}
```

**What this does:**
- Handles null/undefined
- Converts string to Date
- Validates date
- Returns null on error

### Format Options

```typescript
const formatOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: format === 'short' ? 'short' : 'long',
  day: 'numeric',
};

if (includeTime) {
  formatOptions.hour = 'numeric';
  formatOptions.minute = '2-digit';
}

return dateObj.toLocaleDateString(locale, formatOptions);
```

**What this does:**
- Sets format options
- Adds time if requested
- Uses Intl API for localization
- Returns formatted string

## Usage Examples

### Basic Usage

```typescript
const formattedDate = useFormattedDate(image.createdAt);
// "15 tháng 1, 2024"
```

### With Time

```typescript
const formattedDate = useFormattedDate(image.createdAt, {
  includeTime: true,
});
// "15 tháng 1, 2024, 14:30"
```

### Short Format

```typescript
const formattedDate = useFormattedDate(image.createdAt, {
  format: 'short',
});
// "15 thg 1, 2024"
```

### Custom Locale

```typescript
const formattedDate = useFormattedDate(image.createdAt, {
  locale: 'en-US',
});
// "January 15, 2024"
```

## Summary

**useFormattedDate** is the date formatting hook that:
1. ✅ Formats dates consistently
2. ✅ Supports localization
3. ✅ Multiple format options
4. ✅ Handles errors gracefully
5. ✅ Memoized for performance

It's the "date formatter" - making dates readable everywhere!

