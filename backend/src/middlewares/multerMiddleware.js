import multer from 'multer';
import { FILE_UPLOAD } from '../utils/constants.js';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Create the multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: FILE_UPLOAD.MAX_SIZE,
    },
    fileFilter: (req, file, cb) => {
        // Use MulterError for consistent Multer handling in error middleware
        if (!file.mimetype.startsWith('image/')) {
            const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
            err.message = 'Only image files are allowed';
            err.field = file.fieldname;
            return cb(err);
        }

        if (!FILE_UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
            err.message = `Invalid file type. Allowed types: ${FILE_UPLOAD.ALLOWED_MIME_TYPES.join(', ')}`;
            err.field = file.fieldname;
            return cb(err);
        }

        cb(null, true);
    },
});

export const singleUpload = upload.single('image');
export const multipleUpload = upload.array('images', 50); // Max 50 images
export const avatarUpload = upload.single('avatar');
