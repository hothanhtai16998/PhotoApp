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
        if (!file.mimetype.startsWith('image/')) {
            return cb(
                new Error('Only image files are allowed'),
                false
            );
        }

        if (!FILE_UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(
                new Error(
                    `Invalid file type. Allowed types: ${FILE_UPLOAD.ALLOWED_MIME_TYPES.join(', ')}`
                ),
                false
            );
        }

        cb(null, true);
    },
});

export const singleUpload = upload.single('image');
export const avatarUpload = upload.single('avatar');
