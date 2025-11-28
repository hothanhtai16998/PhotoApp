# geocoding Explanation

## What is geocoding?

`geocoding` is a **utility module** that provides geocoding functionality using OpenStreetMap Nominatim API. It converts GPS coordinates to location names (reverse geocoding) and searches for locations (forward geocoding).

## Key Features

### 1. **Reverse Geocoding**
- Converts coordinates to location names
- Vietnamese language support
- Free API (no key required)

### 2. **Location Search**
- Forward geocoding
- Multiple search strategies
- Relevance scoring
- Deduplication

### 3. **Smart Formatting**
- Clean location names
- Country name mapping
- Priority-based component selection

## Step-by-Step Breakdown

### Reverse Geocode

```typescript
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  lang: string = 'vi'
): Promise<GeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang}&addressdetails=1&zoom=18`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PhotoAppWeb/1.0',
      },
    });

    const data = await response.json();
    
    // Extract location name from address components
    const address = data.address;
    const locationParts: string[] = [];

    // Priority order: city/town -> state -> country
    if (address.city || address.town || address.village) {
      locationParts.push(address.city || address.town || address.village);
    }
    if (address.state || address.region) {
      locationParts.push(address.state || address.region);
    }
    
    // Map country names to Vietnamese
    const countryMap: Record<string, string> = {
      'Vietnam': 'Việt Nam',
      'Thailand': 'Thái Lan',
      // ... more countries
    };
    
    const location = locationParts.join(', ');
    return { location };
  } catch (error) {
    return { location: null, error: error.message };
  }
}
```

**What this does:**
- Calls Nominatim reverse geocoding API
- Extracts location components
- Builds location name
- Maps country names
- Returns formatted location

### Search Locations

```typescript
export async function searchLocations(
  query: string,
  lang: string = apiConfig.geocoding.defaultLanguage,
  limit: number = apiConfig.geocoding.defaultLimit
): Promise<LocationSuggestion[]> {
  // Multiple search strategies
  const searchQueries: string[] = [];
  
  // Strategy 1: Full query
  searchQueries.push(cleanQuery);
  
  // Strategy 2: If query contains comma, try parts
  if (cleanQuery.includes(',')) {
    const parts = cleanQuery.split(',').map(p => p.trim());
    searchQueries.push(parts[parts.length - 1]); // City
    searchQueries.push(`${parts[0]} ${parts[parts.length - 1]}`); // Ward + City
  }
  
  // Strategy 3: Last 2 words
  if (queryWords.length > 2) {
    searchQueries.push(queryWords.slice(-2).join(' '));
  }

  // Search with each strategy
  for (const searchQuery of searchQueries) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=${lang}&addressdetails=1&limit=10&dedupe=1&countrycodes=vn`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PhotoAppWeb/1.0' },
    });
    
    const data = await response.json();
    
    // Score and collect results
    for (const item of data) {
      const score = calculateRelevanceScore(cleanQuery, item, address);
      allResults.push({ item, score });
    }
    
    // Delay to respect rate limits
    await delay(timingConfig.geocoding.batchDelayMs);
  }

  // Sort by relevance and return
  allResults.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, limit);
}
```

**What this does:**
- Uses multiple search strategies
- Scores results by relevance
- Deduplicates by coordinates
- Sorts by score
- Returns top results

### Relevance Scoring

```typescript
function calculateRelevanceScore(
  query: string,
  item: NominatimItem,
  address: NominatimAddress
): number {
  let score = 0;
  
  // Exact name match gets highest score
  if (name.includes(word)) {
    score += 10;
  }
  
  // Address component matches
  if (city.includes(word)) score += 8;
  if (state.includes(word)) score += 6;
  if (ward.includes(word)) score += 9;
  
  // Boost important location types
  if (item.type === 'city' || item.type === 'town') {
    score += 5;
  }
  
  // Penalize very long addresses
  if (displayName.length > 80) {
    score -= 3;
  }
  
  return score;
}
```

**What this does:**
- Scores results by relevance
- Considers name matches
- Considers address components
- Boosts important types
- Penalizes overly specific results

## Usage Examples

### Reverse Geocode

```typescript
const result = await reverseGeocode(10.762622, 106.660172);
console.log(result.location); // "Ho Chi Minh City, Ho Chi Minh, Việt Nam"
```

### Search Locations

```typescript
const suggestions = await searchLocations('Ho Chi Minh');
// Returns array of LocationSuggestion with coordinates
```

## Summary

**geocoding** is the geocoding utility that:
1. ✅ Converts coordinates to locations
2. ✅ Searches for locations
3. ✅ Relevance scoring
4. ✅ Vietnamese language support
5. ✅ Free API

It's the "location helper" - making location data accessible!

