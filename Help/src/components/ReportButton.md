# ReportButton Component Explanation

## What is ReportButton?

`ReportButton` is a **reporting component** that allows users to report inappropriate content, users, or collections. It shows a modal with report reasons and description.

## Key Features

### 1. **Multiple Report Types**
- Images
- Collections
- Users

### 2. **Report Reasons**
- Inappropriate content
- Spam
- Copyright violation
- Harassment
- Fake account
- Other

### 3. **Description Field**
- Optional detailed description
- Character limit (1000)
- Helps moderators understand issue

## Step-by-Step Breakdown

### Report Reasons

```typescript
const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate_content', label: 'Nội dung không phù hợp' },
  { value: 'spam', label: 'Spam' },
  { value: 'copyright_violation', label: 'Vi phạm bản quyền' },
  { value: 'harassment', label: 'Quấy rối' },
  { value: 'fake_account', label: 'Tài khoản giả mạo' },
  { value: 'other', label: 'Khác' },
];
```

**What this does:**
- Defines available report reasons
- Localized in Vietnamese
- Covers common issues

### Submit Handler

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!reason) {
    toast.error('Vui lòng chọn lý do báo cáo');
    return;
  }

  setSubmitting(true);
  try {
    await reportService.createReport({
      type,
      targetId,
      reason: reason as ReportReason,
      description: description.trim() || undefined,
    });
    
    toast.success('Đã gửi báo cáo thành công. Cảm ơn bạn đã giúp cải thiện cộng đồng!');
    setShowModal(false);
    setReason('');
    setDescription('');
  } catch (error) {
    toast.error(getErrorMessage(error, 'Không thể gửi báo cáo. Vui lòng thử lại.'));
  } finally {
    setSubmitting(false);
  }
};
```

**What this does:**
- Validates reason is selected
- Submits report to API
- Shows success message
- Resets form on success
- Handles errors

### Type Label

```typescript
const getTypeLabel = () => {
  switch (type) {
    case 'image':
      return 'ảnh';
    case 'collection':
      return 'bộ sưu tập';
    case 'user':
      return 'người dùng';
    default:
      return 'nội dung';
  }
};
```

**What this does:**
- Returns localized label for report type
- Used in modal title
- Better UX

## Summary

**ReportButton** is the reporting interface that:
1. ✅ Supports multiple report types
2. ✅ Provides report reasons
3. ✅ Optional description field
4. ✅ Form validation
5. ✅ Success/error handling

It's the "safety tool" - helping keep the community safe!

