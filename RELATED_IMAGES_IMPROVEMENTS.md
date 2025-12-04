# Related Images Algorithm Improvements

## Overview

The related images feature has been significantly improved with a multi-factor scoring algorithm based on industry best practices from major photo sharing platforms like Unsplash, Pinterest, and Instagram.

## Key Improvements

### 1. **Multi-Factor Scoring System**

The algorithm now evaluates 9 different factors to determine image relevance:

#### Factor 1: Same Photographer (120 points - Highest Priority)
- Images from the same photographer are given the highest weight
- This creates a cohesive collection experience

#### Factor 2: Location Similarity (up to 80 points)
- **Exact match**: Full 80 points
- **Partial match**: 70 points (one location contains the other)
- **Common words**: Up to 50 points based on shared location keywords
- Examples: "New York" matches "New York, USA" or "New York City"

#### Factor 3: Tag Overlap (up to 70 points)
- Uses Jaccard similarity to calculate tag overlap
- More shared tags = higher score
- Example: Images with tags ["dog", "pet", "cute"] and ["dog", "animal", "cute"] get high similarity

#### Factor 4: Same Category (40 points)
- Medium-high priority for category matches
- Works as a good baseline relevance indicator

#### Factor 5: Title Similarity (up to 35 points)
- Uses Jaccard similarity algorithm for text matching
- Considers word overlap between titles
- More sophisticated than simple word counting

#### Factor 6: Description Similarity (up to 30 points)
- Analyzes description text for semantic similarity
- Captures contextual relationships between images

#### Factor 7: Color Overlap (up to 25 points)
- Matches based on dominant colors
- Helps find visually similar images
- Example: Blue images match other blue images

#### Factor 8: Date Proximity (up to 15 points)
- Images uploaded around the same time get a slight boost
- Within 30 days: Higher score
- Within 90 days: Lower score
- Helps surface recent content

#### Factor 9: Popularity Boost (up to 10 points)
- Only applies if image already has relevance (score > 0)
- Based on views and downloads
- Normalized to prevent bias toward extremely popular images

### 2. **Advanced Text Similarity (Jaccard Algorithm)**

Instead of simple word matching, the algorithm now uses Jaccard similarity:
- Normalizes text (lowercase, removes punctuation)
- Calculates intersection over union of word sets
- Returns a score between 0 and 1
- More accurate than counting common words

**Example:**
- "Beautiful sunset over ocean" vs "Sunset over beautiful ocean" = High similarity
- "Dog playing" vs "Cat sleeping" = Low similarity

### 3. **Improved Location Matching**

Location matching now handles:
- Exact matches: "New York" = "New York"
- Partial matches: "New York" contains "New York City"
- Common words: "New York, USA" shares words with "New York, NY"
- Case-insensitive and normalized

### 4. **Tag-Based Similarity**

Uses set operations to find tag overlap:
- Calculates intersection/union ratio
- More accurate than simple tag counting
- Handles duplicate tags gracefully

### 5. **Smart Sorting**

Two-level sorting:
1. **Primary**: By relevance score (descending)
2. **Secondary**: By popularity if scores are very close (±5 points)

This ensures highly relevant images appear first, but popular images are favored when relevance is similar.

### 6. **Minimum Relevance Threshold**

- Minimum score of 20 points required to show an image
- Prevents showing completely unrelated images
- Lower threshold (was 30) allows more diverse results while maintaining quality

## Algorithm Comparison

### Before
- Simple scoring: photographer (100), location (50), category (30), title words (20)
- Only exact location matches
- Basic word counting for titles
- Fixed threshold of 30 points

### After
- Multi-factor scoring with 9 weighted factors (max 400+ points)
- Smart location matching (exact, partial, common words)
- Jaccard similarity for text matching
- Tag overlap calculation
- Color matching
- Date proximity
- Popularity boost
- Flexible threshold with better sorting

## Benefits

1. **More Relevant Results**: Multi-factor approach finds more meaningful relationships
2. **Better Diversity**: Lower threshold allows more images while maintaining quality
3. **Smarter Matching**: Advanced algorithms handle variations and partial matches
4. **User Experience**: More like major platforms (Unsplash, Pinterest)
5. **Scalable**: Works well with large image collections

## Performance Considerations

- All calculations are done client-side for instant results
- Uses memoization to avoid recalculating on every render
- Efficient set operations for tag/color matching
- Minimal impact on performance even with thousands of images

## Future Enhancements (Optional)

1. **Backend API Endpoint**: Move calculation to backend for better performance with large datasets
2. **Visual Similarity**: Use computer vision to find visually similar images
3. **User Behavior**: Factor in which images users view/download together
4. **Machine Learning**: Train a model to predict image relationships
5. **Collaborative Filtering**: "Users who liked this also liked..."

## Testing

To test the improvements:

1. Open an image with tags, location, and description
2. Check that related images:
   - Have shared tags
   - Match location (even partially)
   - Have similar titles/descriptions
   - Are from the same photographer if available
   - Show diverse but relevant results

3. Compare with old algorithm - should see more relevant and diverse results

## Configuration

All scoring weights can be adjusted in the code:

```typescript
// Current weights (can be tuned):
- Same photographer: 120 points
- Location similarity: 80 points  
- Tag overlap: 70 points
- Same category: 40 points
- Title similarity: 35 points
- Description similarity: 30 points
- Color overlap: 25 points
- Date proximity: 15 points
- Popularity boost: 10 points
```

Adjust these values based on your content and user preferences.

