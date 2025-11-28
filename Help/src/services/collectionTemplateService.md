# collectionTemplateService Explanation

## What is collectionTemplateService?

`collectionTemplateService` is a **service module** that provides collection template-related API methods. It handles creating templates, fetching templates, and creating collections from templates.

## Key Features

### 1. **Template Management**
- Get all templates
- Get template by ID
- Create template
- Update template
- Delete template

### 2. **Template Categories**
- Travel, wedding, product
- Portfolio, event, personal
- Other categories

### 3. **Collection Creation**
- Create from template
- Save collection as template
- Default settings

## Step-by-Step Breakdown

### Get Templates

```typescript
getTemplates: async (category?: string): Promise<CollectionTemplate[]> => {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  const response = await api.get<TemplatesResponse>(`/collection-templates${params}`, {
    withCredentials: true,
  });
  return response.data.templates;
},
```

**What this does:**
- Fetches all templates
- Optional category filter
- Returns templates array

### Create Collection from Template

```typescript
createCollectionFromTemplate: async (
  templateId: string,
  data?: CreateCollectionFromTemplateData
): Promise<Collection> => {
  const response = await api.post(`/collection-templates/${templateId}/collections`, data || {}, {
    withCredentials: true,
  });
  return response.data.collection;
},
```

**What this does:**
- Creates collection from template
- Uses template defaults
- Optional overrides
- Returns created collection

### Save Collection as Template

```typescript
saveCollectionAsTemplate: async (
  collectionId: string,
  data: {
    templateName: string;
    category?: string;
  }
): Promise<CollectionTemplate> => {
  const response = await api.post<TemplateResponse>(
    `/collection-templates/from-collection/${collectionId}`,
    data,
    {
      withCredentials: true,
    }
  );
  return response.data.template;
},
```

**What this does:**
- Saves collection as template
- Reusable template
- Returns created template

### Collection Template Structure

```typescript
export interface CollectionTemplate {
  _id: string;
  name: string;
  description?: string;
  templateName: string;
  category: 'travel' | 'wedding' | 'product' | 'portfolio' | 'event' | 'personal' | 'other';
  defaultTags: string[];
  defaultIsPublic: boolean;
  createdBy: { ... };
  isSystemTemplate: boolean;
  usageCount: number;
  iconUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

**What this does:**
- Defines template structure
- Category classification
- Default settings
- Usage tracking

## Usage Examples

### Get Templates

```typescript
const templates = await collectionTemplateService.getTemplates('travel');
```

### Create from Template

```typescript
const collection = await collectionTemplateService.createCollectionFromTemplate(
  templateId,
  {
    name: 'My Travel Collection',
    isPublic: true,
  }
);
```

### Save as Template

```typescript
const template = await collectionTemplateService.saveCollectionAsTemplate(collectionId, {
  templateName: 'My Template',
  category: 'travel',
});
```

## Summary

**collectionTemplateService** is the collection template service that:
1. ✅ Manages templates
2. ✅ Creates collections from templates
3. ✅ Saves collections as templates
4. ✅ Category support
5. ✅ Default settings

It's the "template manager" - making collection creation easier!

