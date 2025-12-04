import { Input } from '@/components/ui/input';
import type { ImageData } from './hooks/useImageUpload';
import type { Category } from '@/services/categoryService';
import type { Coordinates } from '@/types/common';
import { useUserStore } from '@/stores/useUserStore';
import { t } from '@/i18n';
import './UploadForm.css';

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
  onUpdateCoordinates: _onUpdateCoordinates,
}: UploadFormProps) => {
  const { user } = useUserStore();
  const isAdmin = user?.isAdmin === true || user?.isSuperAdmin === true;

  return (
    <div className="upload-form-container">
      {/* Title - sticks to image, same width, no padding, no border radius */}
      <Input
        type="text"
        value={imageData.title}
        onChange={(e) => onUpdate(index, 'title', e.target.value)}
        placeholder={t('image.titlePlaceholder')}
        className="upload-form-input"
      />

      {/* Category - only shown for admin users, sticks to title, same width, no padding, no border radius */}
      {isAdmin && (
        <div>
          {loadingCategories ? (
            <div className="upload-form-category-loading">
              {t('common.loading')}
            </div>
          ) : categories.length === 0 ? (
            <div className="upload-form-category-empty">
              {t('admin.noCategories')}
            </div>
          ) : (
            <select
              value={imageData.category}
              onChange={(e) => onUpdate(index, 'category', e.target.value)}
              className="upload-form-select"
            >
              <option value="">{t('admin.selectCategory')}</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
          {imageData.errors.category && (
            <p className="upload-form-error">
              {imageData.errors.category}
            </p>
          )}
        </div>
      )}

      {/* Tags - shown for all users, below category/title, same style as title */}
      <Input
        type="text"
        value={Array.isArray(imageData.tags) ? imageData.tags.join(', ') : imageData.tags || ''}
        onChange={(e) => {
          // Convert comma-separated string to array
          const tagString = e.target.value;
          const tagsArray = tagString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
          onUpdate(index, 'tags', tagsArray);
        }}
        placeholder={t('collections.tagsPlaceholder')}
        className="upload-form-input"
      />
    </div>
  );
};

