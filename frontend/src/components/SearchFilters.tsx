import { useState, useCallback } from 'react';
import { X, Filter, Calendar, Palette, Image as ImageIcon } from 'lucide-react';
import './SearchFilters.css';

export type Orientation = 'all' | 'portrait' | 'landscape' | 'square';
export type ColorFilter = 'all' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'black' | 'white' | 'gray';

export interface SearchFilters {
  orientation: Orientation;
  color: ColorFilter;
  dateFrom: string;
  dateTo: string;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset: () => void;
}

export default function SearchFiltersComponent({
  filters,
  onFiltersChange,
  onReset,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  }, [localFilters, onFiltersChange]);

  const handleReset = useCallback(() => {
    const defaultFilters: SearchFilters = {
      orientation: 'all',
      color: 'all',
      dateFrom: '',
      dateTo: '',
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onReset();
  }, [onFiltersChange, onReset]);

  const hasActiveFilters = filters.orientation !== 'all' || 
    filters.color !== 'all' || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <div className="search-filters-container">
      <button
        className={`search-filters-toggle ${hasActiveFilters ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Mở bộ lọc tìm kiếm"
        title="Bộ lọc nâng cao"
      >
        <Filter size={18} />
        <span>Bộ lọc</span>
        {hasActiveFilters && <span className="filter-badge" />}
      </button>

      {isOpen && (
        <>
          <div className="search-filters-overlay" onClick={() => setIsOpen(false)} />
          <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
            <div className="search-filters-header">
              <h3>Bộ lọc tìm kiếm</h3>
              <button
                className="search-filters-close"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="search-filters-content">
              {/* Orientation Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <ImageIcon size={16} />
                  Hướng ảnh
                </label>
                <div className="filter-options">
                  {(['all', 'portrait', 'landscape', 'square'] as Orientation[]).map((orientation) => (
                    <button
                      key={orientation}
                      className={`filter-option ${localFilters.orientation === orientation ? 'active' : ''}`}
                      onClick={() => handleFilterChange('orientation', orientation)}
                    >
                      {orientation === 'all' ? 'Tất cả' : 
                       orientation === 'portrait' ? 'Dọc' :
                       orientation === 'landscape' ? 'Ngang' : 'Vuông'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <Palette size={16} />
                  Màu sắc
                </label>
                <div className="filter-color-options">
                  {([
                    { value: 'all', label: 'Tất cả', color: 'transparent' },
                    { value: 'red', label: 'Đỏ', color: '#ef4444' },
                    { value: 'orange', label: 'Cam', color: '#f97316' },
                    { value: 'yellow', label: 'Vàng', color: '#eab308' },
                    { value: 'green', label: 'Xanh lá', color: '#22c55e' },
                    { value: 'blue', label: 'Xanh dương', color: '#3b82f6' },
                    { value: 'purple', label: 'Tím', color: '#a855f7' },
                    { value: 'pink', label: 'Hồng', color: '#ec4899' },
                    { value: 'brown', label: 'Nâu', color: '#a16207' },
                    { value: 'black', label: 'Đen', color: '#000000' },
                    { value: 'white', label: 'Trắng', color: '#ffffff' },
                    { value: 'gray', label: 'Xám', color: '#6b7280' },
                  ] as { value: ColorFilter; label: string; color: string }[]).map((colorOption) => (
                    <button
                      key={colorOption.value}
                      className={`filter-color-option ${localFilters.color === colorOption.value ? 'active' : ''}`}
                      onClick={() => handleFilterChange('color', colorOption.value)}
                      title={colorOption.label}
                    >
                      <span
                        className="filter-color-swatch"
                        style={{
                          backgroundColor: colorOption.color,
                          border: colorOption.value === 'white' ? '1px solid #e5e5e5' : 'none',
                        }}
                      />
                      <span className="filter-color-label">{colorOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  Khoảng thời gian
                </label>
                <div className="filter-date-inputs">
                  <div className="filter-date-input-group">
                    <label>Từ ngày</label>
                    <input
                      type="date"
                      value={localFilters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      max={localFilters.dateTo || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="filter-date-input-group">
                    <label>Đến ngày</label>
                    <input
                      type="date"
                      value={localFilters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      min={localFilters.dateFrom}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="search-filters-footer">
              <button
                className="filter-reset-btn"
                onClick={handleReset}
                disabled={!hasActiveFilters}
              >
                Đặt lại
              </button>
              <button
                className="filter-apply-btn"
                onClick={() => setIsOpen(false)}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


