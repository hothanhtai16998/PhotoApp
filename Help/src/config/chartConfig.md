# chartConfig Explanation

## What is chartConfig?

`chartConfig` is a **configuration file** that contains chart display settings. It defines the number of days to display in analytics charts.

## Key Features

### 1. **Chart Settings**
- Days to display
- Days ago offset
- Chart range configuration

### 2. **Centralized Configuration**
- Easy to edit
- Single source of truth
- Type-safe

## Step-by-Step Breakdown

### Chart Configuration

```typescript
export const chartConfig = {
    // Number of days to display in charts
    daysToDisplay: 14,
    
    // Days ago calculation (14 days = 0 to 13 days ago)
    daysAgoOffset: 13,
} as const;
```

**What this does:**
- Defines chart display range
- 14 days default
- Offset for calculation
- Used in analytics charts

**Why 14 days?**
- Good balance of data
- Not too much (performance)
- Not too little (insights)
- Common analytics range

## Usage Examples

### Chart Display

```typescript
import { chartConfig } from '@/config/chartConfig';

const days = chartConfig.daysToDisplay; // 14
const offset = chartConfig.daysAgoOffset; // 13

// Calculate date range
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - offset);
```

### Analytics Chart

```typescript
import { chartConfig } from '@/config/chartConfig';

const chartData = generateChartData({
  days: chartConfig.daysToDisplay,
  offset: chartConfig.daysAgoOffset,
});
```

## Summary

**chartConfig** is the chart configuration that:
1. ✅ Defines chart display range
2. ✅ Days calculation
3. ✅ Centralized settings
4. ✅ Easy to edit
5. ✅ Type-safe

It's the "chart settings" - centralizing chart configuration!

