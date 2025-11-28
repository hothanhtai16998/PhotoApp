# ImageModalChart Component Explanation

## What is ImageModalChart?

`ImageModalChart` is a **component** that displays analytics charts for image views and downloads. It shows time series data with interactive tooltips.

## Key Features

### 1. **Chart Display**
- Bar chart
- Views and downloads
- 14-day data
- Interactive tooltips

### 2. **Tab Switching**
- Views tab
- Downloads tab
- Active tab highlighting

### 3. **Tooltip Interaction**
- Hover to show
- Date and values
- Positioned dynamically
- Throttled for performance

### 4. **Data Visualization**
- Maximum value calculation
- Bar heights
- Date formatting
- Local timezone

## Step-by-Step Breakdown

### Component Props

```typescript
interface ImageModalChartProps {
  image: Image;
  activeTab: 'views' | 'downloads';
}
```

**What this does:**
- Receives image
- Active tab for display

### Chart Data Hook

```typescript
const { chartData, maxViews, maxDownloads } = useImageChart(image);
```

**What this does:**
- Gets chart data
- Maximum values for scaling
- 14-day time series

### Tooltip Handling

```typescript
const [hoveredBar, setHoveredBar] = useState<{ date: string; views: number; downloads: number; x: number; y: number } | null>(null);
const mouseMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

onMouseMove={(e) => {
  // Throttle mouse move handler
  if (mouseMoveTimeoutRef.current) {
    return;
  }

  mouseMoveTimeoutRef.current = setTimeout(() => {
    mouseMoveTimeoutRef.current = null;

    // Find which bar the mouse is closest to
    const bars = Array.from(chartInner.querySelectorAll('.info-chart-bar'));
    let hoveredBarIndex = -1;
    let minDistance = Infinity;
    let barCenterX = 0;
    let barTopY = 0;

    bars.forEach((bar, index) => {
      const barRect = bar.getBoundingClientRect();
      const barCenter = barRect.left + (barRect.width / 2);
      const distance = Math.abs(e.clientX - barCenter);

      if (distance < minDistance) {
        minDistance = distance;
        hoveredBarIndex = index;
        barCenterX = barCenter;
        barTopY = barRect.top;
      }
    });

    if (hoveredBarIndex >= 0 && hoveredBarIndex < chartData.length) {
      const data = chartData[hoveredBarIndex];
      const dateStr = `${monthNames[data.date.getMonth()]} ${data.date.getDate()}, ${data.date.getFullYear()}`;
      
      setHoveredBar({
        date: dateStr,
        views: data.views,
        downloads: data.downloads,
        x: barCenterX,
        y: barTopY,
      });
    }
  }, 16); // ~60fps
}}
```

**What this does:**
- Throttles mouse move
- Finds closest bar
- Calculates tooltip position
- Updates tooltip data

### Chart Bars

```typescript
{chartData.map((data, index) => {
  const maxValue = activeTab === 'views' ? maxViews : maxDownloads;
  const value = activeTab === 'views' ? data.views : data.downloads;
  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div
      key={index}
      className="info-chart-bar"
      style={{
        height: `${height}%`,
      }}
    />
  );
})}
```

**What this does:**
- Maps chart data to bars
- Calculates bar heights
- Uses active tab value
- Percentage-based heights

### Tooltip Display

```typescript
{hoveredBar && (
  <div
    className="info-chart-tooltip"
    style={{
      left: `${hoveredBar.x}px`,
      top: `${hoveredBar.y - 40}px`,
      transform: 'translateX(-50%)',
    }}
  >
    <div className="tooltip-date">{hoveredBar.date}</div>
    <div className="tooltip-views">Views: {hoveredBar.views}</div>
    <div className="tooltip-downloads">Downloads: {hoveredBar.downloads}</div>
  </div>
)}
```

**What this does:**
- Shows tooltip on hover
- Positioned above bar
- Displays date and values
- Centered on bar

## Usage Examples

### In ImageModalInfo

```typescript
<ImageModalChart image={image} activeTab={activeTab} />
```

## Summary

**ImageModalChart** is the chart component that:
1. ✅ Displays views/downloads charts
2. ✅ Interactive tooltips
3. ✅ Tab switching
4. ✅ Throttled interactions
5. ✅ Local timezone dates

It's the "chart component" - visualizing image analytics!

