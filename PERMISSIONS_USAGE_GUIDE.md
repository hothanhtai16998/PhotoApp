# Hướng dẫn sử dụng Permissions (Quyền hạn)

## 1. Gán quyền cho Admin Role (Trong Admin UI)

### Cách 1: Tạo Role mới
1. Vào trang Admin → Tab "Quyền quản trị"
2. Click nút "+ Thêm quyền Admin"
3. Chọn tài khoản, vai trò (Admin/Moderator/Super Admin)
4. **Scroll xuống** trong phần "Quyền hạn" để thấy các quyền mới:
   - **Yêu thích**: Quản lý yêu thích (`manageFavorites`)
   - **Kiểm duyệt nội dung**: Kiểm duyệt nội dung (`moderateContent`)
   - **Hệ thống**:
     - Xem nhật ký (`viewLogs`)
     - Xuất dữ liệu (`exportData`)
     - Quản lý cài đặt (`manageSettings`)
5. Check các quyền cần thiết
6. Click "Thêm"

### Cách 2: Sửa Role hiện có
1. Vào trang Admin → Tab "Quyền quản trị"
2. Click nút Edit (✏️) trên role cần sửa
3. Check/uncheck các quyền mới
4. Click "Lưu"

---

## 2. Kiểm tra quyền trong Frontend Code

### Sử dụng `usePermissions` Hook

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
    const { hasPermission, isSuperAdmin, hasAnyPermission } = usePermissions();

    // Kiểm tra một quyền cụ thể
    if (hasPermission('manageFavorites')) {
        // User có quyền quản lý yêu thích
    }

    // Kiểm tra nhiều quyền (có ít nhất 1)
    if (hasAnyPermission(['viewLogs', 'exportData'])) {
        // User có ít nhất một trong các quyền này
    }

    // Super admin có tất cả quyền
    if (isSuperAdmin()) {
        // Super admin có tất cả quyền
    }

    return (
        <div>
            {hasPermission('manageFavorites') && (
                <button>Quản lý yêu thích</button>
            )}
            
            {hasPermission('viewLogs') && (
                <button>Xem nhật ký</button>
            )}
        </div>
    );
}
```

### Ví dụ: Ẩn/hiện UI dựa trên quyền

```typescript
function AdminSettingsPage() {
    const { hasPermission } = usePermissions();

    return (
        <div>
            <h1>Cài đặt hệ thống</h1>
            
            {/* Chỉ hiện nếu có quyền viewLogs */}
            {hasPermission('viewLogs') && (
                <section>
                    <h2>Nhật ký hệ thống</h2>
                    <LogViewer />
                </section>
            )}

            {/* Chỉ hiện nếu có quyền exportData */}
            {hasPermission('exportData') && (
                <section>
                    <h2>Xuất dữ liệu</h2>
                    <ExportButton />
                </section>
            )}

            {/* Chỉ hiện nếu có quyền manageSettings */}
            {hasPermission('manageSettings') && (
                <section>
                    <h2>Cài đặt hệ thống</h2>
                    <SettingsForm />
                </section>
            )}
        </div>
    );
}
```

### Ví dụ: Kiểm tra quyền trước khi gọi API

```typescript
function FavoritesManagement() {
    const { hasPermission, isSuperAdmin } = usePermissions();

    const handleDeleteFavorite = async (favoriteId: string) => {
        // Kiểm tra quyền trước khi thực hiện
        if (!isSuperAdmin() && !hasPermission('manageFavorites')) {
            toast.error('Bạn không có quyền quản lý yêu thích');
            return;
        }

        try {
            await favoriteService.deleteFavorite(favoriteId);
            toast.success('Đã xóa yêu thích');
        } catch (error) {
            toast.error('Lỗi khi xóa yêu thích');
        }
    };

    return (
        <div>
            {hasPermission('manageFavorites') && (
                <button onClick={() => handleDeleteFavorite('123')}>
                    Xóa yêu thích
                </button>
            )}
        </div>
    );
}
```

---

## 3. Kiểm tra quyền trong Backend

### Sử dụng Permission Middleware

```javascript
// routes/adminRoutes.js
const { requirePermission } = require('../middlewares/permissionMiddleware');

// Route chỉ cho phép user có quyền viewLogs
router.get('/logs', 
    requirePermission('viewLogs'),
    async (req, res) => {
        // Lấy logs
        const logs = await getSystemLogs();
        res.json({ logs });
    }
);

// Route chỉ cho phép user có quyền exportData
router.get('/export', 
    requirePermission('exportData'),
    async (req, res) => {
        // Xuất dữ liệu
        const data = await exportAllData();
        res.json({ data });
    }
);

// Route chỉ cho phép user có quyền manageSettings
router.put('/settings', 
    requirePermission('manageSettings'),
    async (req, res) => {
        // Cập nhật cài đặt
        await updateSettings(req.body);
        res.json({ success: true });
    }
);
```

### Kiểm tra quyền trong Controller

```javascript
// controllers/adminController.js
const { hasPermission } = require('../middlewares/permissionMiddleware');

async function getSystemLogs(req, res) {
    const userId = req.user._id;
    
    // Kiểm tra quyền
    const canViewLogs = await hasPermission(userId, 'viewLogs');
    if (!canViewLogs) {
        return res.status(403).json({ 
            message: 'Bạn không có quyền xem nhật ký' 
        });
    }

    const logs = await Log.find().sort({ createdAt: -1 });
    res.json({ logs });
}
```

---

## 4. Danh sách các quyền mới

| Quyền | Key | Mô tả |
|-------|-----|-------|
| Quản lý yêu thích | `manageFavorites` | Quản lý danh sách yêu thích của users |
| Kiểm duyệt nội dung | `moderateContent` | Kiểm duyệt nội dung tổng quát |
| Xem nhật ký | `viewLogs` | Xem nhật ký hệ thống |
| Xuất dữ liệu | `exportData` | Xuất dữ liệu từ hệ thống |
| Quản lý cài đặt | `manageSettings` | Quản lý cài đặt hệ thống |

---

## 5. Ví dụ thực tế

### Ví dụ 1: Trang quản lý Logs

```typescript
// pages/AdminLogsPage.tsx
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

function AdminLogsPage() {
    const { hasPermission, isSuperAdmin } = usePermissions();

    // Redirect nếu không có quyền
    if (!isSuperAdmin() && !hasPermission('viewLogs')) {
        return <Navigate to="/admin" replace />;
    }

    return (
        <div>
            <h1>Nhật ký hệ thống</h1>
            <LogViewer />
        </div>
    );
}
```

### Ví dụ 2: Button xuất dữ liệu

```typescript
// components/ExportDataButton.tsx
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

function ExportDataButton() {
    const { hasPermission, isSuperAdmin } = usePermissions();

    const handleExport = async () => {
        if (!isSuperAdmin() && !hasPermission('exportData')) {
            toast.error('Bạn không có quyền xuất dữ liệu');
            return;
        }

        try {
            const data = await adminService.exportData();
            // Download file
            downloadFile(data);
            toast.success('Đã xuất dữ liệu thành công');
        } catch (error) {
            toast.error('Lỗi khi xuất dữ liệu');
        }
    };

    // Chỉ hiện button nếu có quyền
    if (!isSuperAdmin() && !hasPermission('exportData')) {
        return null;
    }

    return (
        <button onClick={handleExport}>
            Xuất dữ liệu
        </button>
    );
}
```

### Ví dụ 3: Sidebar navigation với quyền

```typescript
// components/AdminSidebar.tsx
import { usePermissions } from '@/hooks/usePermissions';

function AdminSidebar() {
    const { hasPermission, isSuperAdmin } = usePermissions();

    return (
        <nav>
            <Link to="/admin/dashboard">Dashboard</Link>
            
            {/* Chỉ hiện nếu có quyền viewLogs */}
            {(isSuperAdmin() || hasPermission('viewLogs')) && (
                <Link to="/admin/logs">Nhật ký</Link>
            )}

            {/* Chỉ hiện nếu có quyền exportData */}
            {(isSuperAdmin() || hasPermission('exportData')) && (
                <Link to="/admin/export">Xuất dữ liệu</Link>
            )}

            {/* Chỉ hiện nếu có quyền manageSettings */}
            {(isSuperAdmin() || hasPermission('manageSettings')) && (
                <Link to="/admin/settings">Cài đặt</Link>
            )}
        </nav>
    );
}
```

---

## 6. Lưu ý quan trọng

1. **Super Admin có tất cả quyền**: Super admin tự động có tất cả quyền, không cần check từng quyền
2. **Kiểm tra cả frontend và backend**: Luôn kiểm tra quyền ở cả 2 nơi để đảm bảo bảo mật
3. **Permission object**: User phải có `permissions` object trong user data để sử dụng quyền
4. **Legacy support**: Các quyền cũ (`manageUsers`, `manageImages`, etc.) vẫn hoạt động để tương thích ngược

---

## 7. Debugging

Để kiểm tra quyền của user hiện tại:

```typescript
import { useAuthStore } from '@/stores/useAuthStore';

function DebugPermissions() {
    const user = useAuthStore((state) => state.user);
    
    console.log('User permissions:', user?.permissions);
    console.log('Is Super Admin:', user?.isSuperAdmin);
    console.log('Is Admin:', user?.isAdmin);
    
    return null;
}
```

