# reportService Explanation

## What is reportService?

`reportService` is a **service module** that provides report-related API methods. It handles creating reports, fetching user reports, and admin report management.

## Key Features

### 1. **Report Operations**
- Create report
- Get user reports
- Get all reports (admin)
- Update report status (admin)

### 2. **Report Types**
- Image reports
- Collection reports
- User reports

### 3. **Report Reasons**
- Inappropriate content
- Spam
- Copyright violation
- Harassment
- Fake account
- Other

## Step-by-Step Breakdown

### Report Types

```typescript
export type ReportType = 'image' | 'collection' | 'user';
export type ReportReason = 
    | 'inappropriate_content'
    | 'spam'
    | 'copyright_violation'
    | 'harassment'
    | 'fake_account'
    | 'other';
```

**What this does:**
- Defines report types
- Defines report reasons
- Type-safe enums

### Create Report

```typescript
createReport: async (data: CreateReportData): Promise<Report> => {
  const response = await api.post<ReportResponse>('/reports', data, {
    withCredentials: true,
  });
  if (response.data.success && response.data.report) {
    return response.data.report;
  }
  throw new Error(response.data.message || 'Failed to create report');
},
```

**What this does:**
- Creates new report
- Validates response
- Returns report data
- Throws on error

### Get User Reports

```typescript
getUserReports: async (params?: {
  page?: number;
  limit?: number;
}): Promise<{ reports: Report[]; pagination: Record<string, unknown> }> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `/reports?${queryString}` : '/reports';

  const response = await api.get<ReportResponse>(url, {
    withCredentials: true,
  });
  if (response.data.success && response.data.reports) {
    return {
      reports: response.data.reports,
      pagination: response.data.pagination || {},
    };
  }
  throw new Error('Failed to fetch reports');
},
```

**What this does:**
- Fetches user's reports
- Supports pagination
- Returns reports and pagination
- Validates response

### Get All Reports (Admin)

```typescript
getAllReports: async (params?: {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<{ reports: Report[]; pagination: Record<string, unknown> }> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `/reports/admin?${queryString}` : '/reports/admin';

  const response = await api.get<ReportResponse>(url, {
    withCredentials: true,
  });
  // Similar validation...
},
```

**What this does:**
- Fetches all reports (admin only)
- Filters by status and type
- Supports pagination
- Used in admin dashboard

### Update Report Status (Admin)

```typescript
updateReportStatus: async (
  reportId: string,
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed',
  resolution?: string
): Promise<Report> => {
  const response = await api.patch<ReportResponse>(
    `/reports/admin/${reportId}`,
    { status, resolution },
    { withCredentials: true }
  );
  if (response.data.success && response.data.report) {
    return response.data.report;
  }
  throw new Error(response.data.message || 'Failed to update report');
},
```

**What this does:**
- Updates report status
- Sets resolution (optional)
- Admin only
- Returns updated report

## Usage Examples

### Create Report

```typescript
const report = await reportService.createReport({
  type: 'image',
  targetId: imageId,
  reason: 'inappropriate_content',
  description: 'Contains inappropriate content',
});
```

### Get User Reports

```typescript
const { reports, pagination } = await reportService.getUserReports({
  page: 1,
  limit: 20,
});
```

### Get All Reports (Admin)

```typescript
const { reports } = await reportService.getAllReports({
  status: 'pending',
  type: 'image',
  page: 1,
});
```

### Update Status (Admin)

```typescript
const report = await reportService.updateReportStatus(
  reportId,
  'resolved',
  'Content removed'
);
```

## Summary

**reportService** is the report management service that:
1. ✅ Creates reports
2. ✅ Fetches user reports
3. ✅ Admin report management
4. ✅ Status updates
5. ✅ Type-safe interfaces

It's the "report API" - keeping the community safe!

