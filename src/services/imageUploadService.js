import axios from 'axios';

const API = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
    timeout: 30000,
    withCredentials: true, // send cookies
});

// Add your auth token if using JWT
const token = localStorage.getItem('authToken'); // or your token key
if (token) {
    API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

/**
 * Step 1: Get presigned upload URL from server
 */
export const preUploadImage = async (fileName, fileType, fileSize) => {
    const res = await API.post('/images/preupload', {
        fileName,
        fileType,
        fileSize,
    });
    return res.data; // { uploadId, uploadUrl, uploadKey, expiresIn }
};

/**
 * Step 1b: Upload file directly to S3 using presigned URL
 */
export const uploadFileToS3 = async (uploadUrl, file) => {
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                console.log(`Upload progress: ${percentComplete.toFixed(2)}%`);
                // emit progress event for UI
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({ ok: true });
            } else {
                reject(new Error(`S3 upload failed: ${xhr.status}`));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error uploading to S3')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    });
};

/**
 * Step 2: Tell server to finalize (start background processing)
 */
export const finalizeImageUpload = async (uploadId, uploadKey, metadata) => {
    const res = await API.post('/images/finalize', {
        uploadId,
        uploadKey,
        imageTitle: metadata.imageTitle,
        imageCategory: metadata.imageCategory,
        location: metadata.location,
        cameraModel: metadata.cameraModel,
        coordinates: metadata.coordinates,
        tags: metadata.tags,
    });
    return res.data; // { success: true, message, jobId? }
};

/**
 * Main upload flow: preupload → S3 PUT → finalize
 */
export const uploadImageFull = async (file, metadata, onProgress) => {
    try {
        // Step 1: Get presigned URL
        console.time('preupload');
        const preRes = await preUploadImage(file.name, file.type, file.size);
        console.timeEnd('preupload');
        const { uploadUrl, uploadKey, uploadId } = preRes;

        // Step 1b: Upload directly to S3
        console.time('s3-upload');
        await uploadFileToS3(uploadUrl, file);
        console.timeEnd('s3-upload');

        // Step 2: Finalize (server enqueues background job, returns 202 immediately)
        console.time('finalize');
        const finalRes = await finalizeImageUpload(uploadId, uploadKey, metadata);
        console.timeEnd('finalize');

        return { ok: true, message: 'Upload accepted — processing in background' };
    } catch (err) {
        return { ok: false, error: err.message };
    }
};