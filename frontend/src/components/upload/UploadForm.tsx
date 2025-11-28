import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagInput } from '@/components/ui/TagInput';
import { MapPin } from 'lucide-react';
import { reverseGeocode, delay, searchLocations, type LocationSuggestion } from '@/utils/geocoding';
import type { ImageData } from './hooks/useImageUpload';
import type { Category } from '@/services/categoryService';
import type { Coordinates } from '@/types/common';
import { uiConfig } from '@/config/uiConfig';
import { timingConfig } from '@/config/timingConfig';

interface UploadFormProps {
  imageData: ImageData;
  index: number;
  categories: Category[];
  loadingCategories: boolean;
  onUpdate: (index: number, field: 'title' | 'category' | 'location' | 'cameraModel' | 'tags', value: string | string[]) => void;
  onUpdateCoordinates: (index: number, coordinates: Coordinates | undefined) => void;
}

export const UploadForm = ({
  imageData,
  index,
  categories,
  loadingCategories,
  onUpdate,
  onUpdateCoordinates,
}: UploadFormProps) => {
  const [detectingLocationIndex, setDetectingLocationIndex] = useState<number | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [loadingLocationSuggestions, setLoadingLocationSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const locationDropdownRef = useRef<HTMLDivElement | null>(null);
  const locationSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Detect user's current location and reverse geocode to location name (called on button click)
  const handleDetectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      return;
    }

    setDetectingLocationIndex(index);

    try {
      // Get GPS coordinates
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: timingConfig.geolocation.timeoutMs,
            maximumAge: timingConfig.geolocation.maximumAgeMs,
          }
        );
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Reverse geocode coordinates to location name
      // Small delay to respect API rate limits (1 request per second)
      await delay(timingConfig.geocoding.rateLimitDelayMs);
      const geocodeResult = await reverseGeocode(
        coords.latitude,
        coords.longitude,
        'vi' // Vietnamese language
      );

      // Update the location for this specific image
      onUpdate(index, 'location', geocodeResult.location || '');
      onUpdateCoordinates(index, coords);

      setDetectingLocationIndex(null);
    } catch (error) {
      setDetectingLocationIndex(null);
      console.warn('Error detecting location:', error);
    }
  }, [index, onUpdate, onUpdateCoordinates]);

  // Handle location field changes with debounced search
  const handleLocationChange = useCallback((value: string) => {
    onUpdate(index, 'location', value);

    // Clear previous timeout
    if (locationSearchTimeoutRef.current) {
      clearTimeout(locationSearchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      // Show loading state
      setLoadingLocationSuggestions(true);

      // Debounce search to avoid too many API calls
      locationSearchTimeoutRef.current = setTimeout(async () => {
        try {
          // Small initial delay to respect API rate limits
          await delay(timingConfig.ui.locationSearchInitialDelayMs);
          const suggestions = await searchLocations(value.trim(), 'vi', 8);
          setLocationSuggestions(suggestions);
          setShowLocationSuggestions(suggestions.length > 0);
        } catch (error) {
          console.warn('Error searching locations:', error);
          setLocationSuggestions([]);
          setShowLocationSuggestions(false);
        } finally {
          setLoadingLocationSuggestions(false);
        }
      }, timingConfig.ui.locationSearchDebounceMs); // Wait after user stops typing
    } else {
      setShowLocationSuggestions(false);
      setLocationSuggestions([]);
    }
  }, [index, onUpdate]);

  // Handle location suggestion selection
  const selectLocation = useCallback((suggestion: LocationSuggestion) => {
    onUpdate(index, 'location', suggestion.displayName);
    onUpdateCoordinates(index, {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    setShowLocationSuggestions(false);
    
    // Clear search timeout
    if (locationSearchTimeoutRef.current) {
      clearTimeout(locationSearchTimeoutRef.current);
    }
  }, [index, onUpdate, onUpdateCoordinates]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = locationDropdownRef.current;
      const input = locationInputRef.current;
      if (dropdown && input && 
          !dropdown.contains(event.target as Node) && 
          !input.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (locationSearchTimeoutRef.current) {
        clearTimeout(locationSearchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Title */}
      <div>
        <Label htmlFor={`title-${index}`} style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
          Tiêu đề <span style={{ color: 'red' }}>*</span>
        </Label>
        <Input
          id={`title-${index}`}
          type="text"
          value={imageData.title}
          onChange={(e) => onUpdate(index, 'title', e.target.value)}
          placeholder="Thêm tiêu đề cho ảnh của bạn"
          style={{
            borderColor: imageData.errors.title ? '#ef4444' : undefined
          }}
        />
        {imageData.errors.title && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
            {imageData.errors.title}
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <Label htmlFor={`category-${index}`} style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
          Danh mục <span style={{ color: 'red' }}>*</span>
        </Label>
        {loadingCategories ? (
          <div style={{ padding: '8px', color: '#666', fontSize: '14px' }}>Đang tải danh mục...</div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '8px', color: '#999', fontSize: '14px' }}>Danh mục không tồn tại</div>
        ) : (
          <select
            id={`category-${index}`}
            value={imageData.category}
            onChange={(e) => onUpdate(index, 'category', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${imageData.errors.category ? '#ef4444' : '#e5e5e5'}`,
              borderRadius: '6px',
              fontSize: '0.9375rem',
              backgroundColor: 'white',
            }}
          >
            <option value="">Chọn một danh mục...</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        )}
        {imageData.errors.category && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
            {imageData.errors.category}
          </p>
        )}
      </div>

      {/* Location */}
      <div style={{ position: 'relative' }}>
        <Label htmlFor={`location-${index}`} style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
          Địa điểm
          {imageData.coordinates && (
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#10b981', fontWeight: 'normal' }}>
              (GPS: {imageData.coordinates.latitude.toFixed(4)}, {imageData.coordinates.longitude.toFixed(4)})
            </span>
          )}
        </Label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Input
              id={`location-${index}`}
              type="text"
              value={imageData.location}
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={() => {
                // If there's existing text, search for suggestions
                if (imageData.location.trim().length >= 2) {
                  handleLocationChange(imageData.location);
                }
              }}
              placeholder="Nhập địa điểm (ví dụ: Phú Quốc, Việt Nam)"
              ref={locationInputRef}
              style={{
                width: '100%',
                backgroundColor: imageData.location && imageData.coordinates ? '#f0fdf4' : undefined,
              }}
            />
            {/* Location Suggestions Dropdown */}
            {showLocationSuggestions && (
              <div
                ref={locationDropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                  zIndex: 1000,
                  maxHeight: '240px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                }}
              >
                {loadingLocationSuggestions ? (
                  <div style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #6366f1',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <span>Đang tìm kiếm...</span>
                  </div>
                ) : locationSuggestions.length > 0 ? (
                  locationSuggestions.map((suggestion, sugIndex) => {
                    // Highlight matching text
                    const query = imageData.location.toLowerCase();
                    const displayName = suggestion.displayName;
                    const lowerDisplayName = displayName.toLowerCase();
                    const matchIndex = lowerDisplayName.indexOf(query);
                    
                    let highlightedName;
                    if (matchIndex !== -1 && query.length >= 2) {
                      const before = displayName.substring(0, matchIndex);
                      const match = displayName.substring(matchIndex, matchIndex + query.length);
                      const after = displayName.substring(matchIndex + query.length);
                      highlightedName = (
                        <>
                          {before}
                          <strong style={{ color: '#6366f1', fontWeight: '600' }}>{match}</strong>
                          {after}
                        </>
                      );
                    } else {
                      highlightedName = displayName;
                    }

                    return (
                      <button
                        key={`${suggestion.latitude}-${suggestion.longitude}-${sugIndex}`}
                        type="button"
                        onClick={() => selectLocation(suggestion)}
                        onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          textAlign: 'left',
                          border: 'none',
                          borderBottom: sugIndex < locationSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#333',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <MapPin size={14} style={{ color: '#666', flexShrink: 0 }} />
                        <span style={{ flex: 1, lineHeight: '1.4' }}>{highlightedName}</span>
                      </button>
                    );
                  })
                ) : imageData.location.trim().length >= 2 ? (
                  <div style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    Không tìm thấy địa điểm
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <Button
            type="button"
            onClick={handleDetectLocation}
            disabled={detectingLocationIndex === index}
            variant="outline"
            size="sm"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '120px',
            }}
          >
            {detectingLocationIndex === index ? (
              <>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #6366f1',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span>Đang tìm...</span>
              </>
            ) : (
              <>
                <MapPin size={16} />
                <span>Vị trí hiện tại</span>
              </>
            )}
          </Button>
        </div>
        {imageData.location && imageData.coordinates && (
          <p style={{ marginTop: '4px', fontSize: '12px', color: '#059669' }}>
            ✓ Đã phát hiện tự động
          </p>
        )}
      </div>

      {/* Camera Model */}
      <div>
        <Label htmlFor={`camera-${index}`} style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
          Camera Model
        </Label>
        <Input
          id={`camera-${index}`}
          type="text"
          value={imageData.cameraModel}
          onChange={(e) => onUpdate(index, 'cameraModel', e.target.value)}
          placeholder="Sony A7 III,..."
        />
      </div>

      {/* Tags */}
      <div>
        <Label htmlFor={`tags-${index}`} style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
          Tags
        </Label>
        <TagInput
          tags={imageData.tags || []}
          onChange={(tags) => onUpdate(index, 'tags', tags)}
          placeholder="Nhập tag và nhấn Enter (ví dụ: nature, landscape, sunset)..."
          maxTags={uiConfig.tags.maxTags}
          maxTagLength={uiConfig.tags.maxTagLength}
        />
      </div>
    </div>
  );
};

