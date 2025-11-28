# ContactOptionSelector Component Explanation

## What is ContactOptionSelector?

`ContactOptionSelector` is a **component** that allows users to select different contact button styles. It provides 16 different contact button options with categories and descriptions.

## Key Features

### 1. **Contact Options**
- 16 different styles (A-P)
- Categories (recommended, mobile, minimal, visible)
- Descriptions and pros
- Best for recommendations

### 2. **Category Filtering**
- All options
- Recommended only
- Mobile-friendly
- Minimal designs
- Always visible

### 3. **Persistence**
- Saves to localStorage
- Loads on mount
- Remembers selection

## Step-by-Step Breakdown

### Component Props

```typescript
interface ContactOptionSelectorProps {
  currentOption: ContactOption;
  onOptionChange: (option: ContactOption) => void;
}

type ContactOption = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P";
type Category = "all" | "recommended" | "mobile" | "minimal" | "visible";
```

**What this does:**
- Receives current option
- Change handler
- Type-safe options

### Load Saved Option

```typescript
useEffect(() => {
  const saved = localStorage.getItem("contactButtonOption") as ContactOption | null;
  if (saved && ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"].includes(saved)) {
    onOptionChange(saved);
  }
}, [onOptionChange]);
```

**What this does:**
- Loads from localStorage
- Validates option
- Updates parent

### Option Change Handler

```typescript
const handleOptionChange = (option: ContactOption) => {
  onOptionChange(option);
  localStorage.setItem("contactButtonOption", option);
  setIsOpen(false);
};
```

**What this does:**
- Updates parent
- Saves to localStorage
- Closes selector

### Option Definitions

```typescript
const options = [
  { 
    value: "A" as ContactOption, 
    label: "Button → Modal", 
    description: "Simple button opens centered modal",
    category: ["recommended", "minimal"] as Category[],
    bestFor: "Most websites",
    pros: ["Simple", "Familiar", "Clean"]
  },
  { 
    value: "B" as ContactOption, 
    label: "Button → Drawer", 
    description: "Button opens slide-in drawer from right",
    category: ["recommended", "mobile"] as Category[],
    bestFor: "Mobile-friendly sites",
    pros: ["Mobile optimized", "Space efficient"]
  },
  // ... more options
];
```

**What this does:**
- Defines all options
- Categories and descriptions
- Best for recommendations

### Category Filtering

```typescript
const filteredOptions = category === "all" 
  ? options 
  : options.filter(option => option.category.includes(category));
```

**What this does:**
- Filters by category
- Shows all if "all"
- Updates on category change

## Usage Examples

### In Settings

```typescript
<ContactOptionSelector
  currentOption={contactOption}
  onOptionChange={setContactOption}
/>
```

## Summary

**ContactOptionSelector** is the contact option selector component that:
1. ✅ 16 contact button styles
2. ✅ Category filtering
3. ✅ Descriptions and pros
4. ✅ localStorage persistence
5. ✅ Best for recommendations

It's the "contact selector" - choosing contact button styles!

