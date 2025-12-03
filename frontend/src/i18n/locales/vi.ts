/**
 * Vietnamese translations (default language)
 */
export const vi = {
  // Common
  common: {
    loading: 'Đang tải...',
    error: 'Đã xảy ra lỗi',
    success: 'Thành công',
    cancel: 'Huỷ',
    save: 'Lưu',
    delete: 'Xóa',
    edit: 'Chỉnh sửa',
    close: 'Đóng',
    confirm: 'Xác nhận',
    back: 'Quay lại',
    next: 'Tiếp theo',
    previous: 'Trước',
    search: 'Tìm kiếm',
    noResults: 'Không có kết quả',
    tryAgain: 'Vui lòng thử lại',
    saveChanges: 'Lưu thay đổi',
    create: 'Tạo',
  },

  // Auth
  auth: {
    signIn: 'Đăng nhập',
    signUp: 'Đăng ký',
    signOut: 'Đăng xuất',
    signUpSuccess:
      'Đăng ký thành công! Bạn sẽ được chuyển sang trang đăng nhập.',
    signUpFailed: 'Đăng ký thất bại. Vui lòng thử lại.',
    signInFailed:
      'Đăng nhập thất bại. Kiểm tra lại tên tài khoản hoặc mật khẩu của bạn.',
    signOutSuccess: 'Đăng xuất thành công!',
    welcomeBack: 'Chào mừng bạn quay lại 🎉',
    sessionExpired: 'Session hết hạn. Vui lòng đăng nhập lại.',
    validationError: 'Lỗi xác thực',
    pleaseSignIn: 'Vui lòng đăng nhập lại.',
  },

  // Errors
  errors: {
    generic: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    network: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.',
    timeout: 'Yêu cầu hết thời gian. Vui lòng thử lại.',
    unauthorized: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    notFound: 'Không tìm thấy tài nguyên.',
    server: 'Lỗi máy chủ. Vui lòng thử lại sau.',
    rateLimited: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    imageIdError: 'Lỗi khi lấy ID của ảnh',
  },

  // Favorites
  favorites: {
    title: 'Ảnh yêu thích',
    empty: 'Chưa có ảnh yêu thích',
    emptyHint: 'Bắt đầu lưu những ảnh bạn yêu thích để xem lại sau',
    explore: 'Khám phá ảnh',
    added: 'Đã thêm vào yêu thích',
    removed: 'Đã xóa khỏi yêu thích',
    updateFailed: 'Không thể cập nhật yêu thích. Vui lòng thử lại.',
    count: '{count} ảnh đã lưu',
    noFavorites: 'Chưa có ảnh yêu thích nào',
    downloadSuccess: 'Tải ảnh thành công',
    downloadFailed: 'Tải ảnh thất bại. Vui lòng thử lại.',
    listLabel: 'Danh sách ảnh yêu thích',
    imageLabel: 'Ảnh yêu thích: {title}',
  },

  // Collections
  collections: {
    title: 'Bộ sưu tập',
    saveToCollection: 'Lưu vào bộ sưu tập',
    createNew: 'Tạo bộ sưu tập mới',
    createFromTemplate: 'Tạo từ mẫu',
    selectTemplate: 'Chọn mẫu',
    collectionName: 'Tên bộ sưu tập',
    collectionNamePlaceholder: 'Ví dụ: Ảnh phong cảnh đẹp',
    description: 'Mô tả (tùy chọn)',
    descriptionPlaceholder: 'Mô tả ngắn về bộ sưu tập này...',
    public: 'Công khai (mọi người có thể xem)',
    tags: 'Thẻ (tối đa 10)',
    tagsPlaceholder: 'Nhập thẻ và nhấn Enter hoặc dấu phẩy',
    creating: 'Đang tạo...',
    saving: 'Đang lưu...',
    created: 'Đã tạo bộ sưu tập',
    createdAndAdded: 'Đã tạo bộ sưu tập và thêm ảnh',
    updated: 'Đã cập nhật bộ sưu tập',
    imageAdded: 'Đã thêm ảnh vào bộ sưu tập',
    imageRemoved: 'Đã xóa ảnh khỏi bộ sưu tập',
    coverSet: 'Đã đặt ảnh làm ảnh bìa',
    loadFailed: 'Không thể tải danh sách bộ sưu tập',
    createFailed: 'Không thể tạo bộ sưu tập. Vui lòng thử lại.',
    updateFailed: 'Không thể cập nhật bộ sưu tập. Vui lòng thử lại.',
    deleteFailed: 'Không thể xóa bộ sưu tập. Vui lòng thử lại.',
    coverFailed: 'Không thể đặt ảnh bìa. Vui lòng thử lại.',
    empty: 'Bạn chưa có bộ sưu tập nào',
    emptyHint: 'Tạo bộ sưu tập đầu tiên của bạn để lưu ảnh yêu thích',
    imageCount: '{count} ảnh',
    versionRestored: 'Đã khôi phục về phiên bản {version}',
    versionRestoreFailed: 'Không thể khôi phục phiên bản. Vui lòng thử lại.',
    versionLoadFailed: 'Không thể tải lịch sử phiên bản',
    editCollection: 'Chỉnh sửa bộ sưu tập',
    imageIdNotFound: 'Không tìm thấy ID ảnh',
    enterName: 'Vui lòng nhập tên bộ sưu tập',
    createFromTemplateTitle: 'Tạo từ mẫu: {name}',
    clearTemplate: 'Xóa mẫu',
  },

  // Upload
  upload: {
    title: 'Thêm ảnh vào PhotoApp',
    addImage: 'Thêm ảnh',
    addMore: 'Thêm ảnh',
    dragDrop: 'Kéo thả hoặc',
    browse: 'Chọn',
    browseHint: 'ảnh từ máy tính, điện thoại (có thể chọn nhiều ảnh)',
    maxSize: 'Tối đa 10 MB',
    selected: 'Đã chọn {count} ảnh',
    uploading: 'Đang tải...',
    submit: 'Gửi {count} ảnh',
    success: 'Thêm ảnh thành công 🎉',
    successHint: 'Our Editorial team is now reviewing your image.',
    viewProfile: 'Xem trang cá nhân',
    fillRequired: 'Vui lòng điền đầy đủ các trường có dấu',
  },

  // Header
  header: {
    addImage: 'Thêm ảnh',
    favorites: 'Yêu thích',
    admin: 'Admin',
    about: 'Về chúng tôi',
    account: 'Tài khoản',
    userMenu: 'Menu người dùng',
    toggleMenu: 'Chuyển đổi menu',
    company: 'Công ty',
    products: 'Sản phẩm',
    community: 'Cộng đồng',
    explore: 'Khám phá',
    legal: 'Pháp lý',
    submitImage: 'Submit an image',
    logIn: 'Log in',
    newToUnsplash: 'New to Unsplash?',
    signUpFree: 'Sign up for free',
  },

  // Search
  search: {
    placeholder: 'Tìm kiếm ảnh, minh họa...',
    label: 'Tìm kiếm ảnh',
    clear: 'Xóa tìm kiếm',
    hint: 'Nhập từ khóa để tìm kiếm ảnh. Sử dụng phím mũi tên để điều hướng, Enter để chọn, Escape để đóng.',
  },

  // Admin
  admin: {
    title: 'Trang quản lý',
    dashboard: 'Dashboard',
    analytics: 'Phân tích',
    users: 'Người dùng',
    images: 'Ảnh',
    categories: 'Danh mục ảnh',
    collections: 'Bộ sưu tập',
    roles: 'Quyền quản trị',
    permissions: 'Ma trận quyền hạn',
    favorites: 'Quản lý yêu thích',
    moderation: 'Kiểm duyệt nội dung',
    logs: 'Nhật ký hệ thống',
    settings: 'Cài đặt',
    accessDenied: 'Cần quyền Admin để truy cập trang này.',
  },

  // Image
  image: {
    untitled: 'Không có tiêu đề',
    download: 'Tải xuống',
    downloadOptions: 'Tùy chọn tải xuống',
    addToCollection: 'Thêm vào bộ sưu tập',
    bookmark: 'Đánh dấu',
    removeBookmark: 'Bỏ đánh dấu',
    like: 'Thích ảnh',
    small: 'Nhỏ',
    medium: 'Vừa',
    large: 'Lớn',
    original: 'Gốc',
  },

  // Profile
  profile: {
    title: 'Tài khoản',
    editProfile: 'Chỉnh sửa hồ sơ',
  },

  // Pagination
  pagination: {
    page: 'Trang {current} / {total}',
    previous: 'Trước',
    next: 'Sau',
  },

  // Accessibility
  a11y: {
    loading: 'Đang tải',
    loadingImages: 'Đang tải ảnh',
    loadingFavorites: 'Đang tải ảnh yêu thích',
    favoriteImage: 'Ảnh yêu thích: {title}',
    previousPage: 'Trang trước',
    nextPage: 'Trang sau',
    closeMenu: 'Đóng menu',
  },
} as const;

export type TranslationKeys = typeof vi;
