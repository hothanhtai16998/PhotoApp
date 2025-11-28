import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { getObjectFromS3, streamToBuffer, uploadImageWithSizes, deleteObjectByKey } from '../libs/s3.js';
import Image from '../models/Image.js';
import Notification from '../models/Notification.js';
import { extractDominantColors } from '../utils/colorExtractor.js';
import { extractExifData } from '../utils/exifExtractor.js';
import { findCategory, parseTags, validateCoordinates } from '../utils/imageHelpers.js'; // extract helper functions
import { logger } from '../utils/logger.js';
import { Worker as ThreadWorker } from 'worker_threads';
import path from 'path';
import os from 'os';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const NUM_WORKERS = Math.max(2, Math.floor(os.cpus().length / 2));
const workerPool = [];

// Initialize worker thread pool for image processing
for (let i = 0; i < NUM_WORKERS; i++) {
    workerPool.push(
        new ThreadWorker(new URL('./imageResizeWorker.js', import.meta.url))
    );
}

const processImageInThread = (imageBuffer) => {
    return new Promise((resolve, reject) => {
        const worker = workerPool[Math.floor(Math.random() * workerPool.length)];
        const handler = (msg) => {
            worker.off('message', handler);
            worker.off('error', reject);
            if (msg.error) reject(new Error(msg.error));
            else resolve(msg.result);
        };
        worker.on('message', handler);
        worker.on('error', reject);
        worker.postMessage({ buffer: imageBuffer });
    });
};

const worker = new Worker('image-processing', async job => {
    const data = job.data;
    const { uploadKey, userId, isAdmin, imageTitle, imageCategory, location, cameraModel, coordinates, tags } = data;

    try {
        // download raw upload as stream and buffer (streaming into sharp is possible too)
        const raw = await getObjectFromS3(uploadKey);
        if (!raw.Body) throw new Error('No raw object body');

        const buffer = await streamToBuffer(raw.Body);

        // extract metadata in parallel
        const [dominantColors, exifData] = await Promise.all([
            extractDominantColors(buffer, 3).catch(e => { logger.warn(e.message); return []; }),
            extractExifData(buffer).catch(e => { logger.warn(e.message); return {}; })
        ]);

        // upload processed sizes (this should use optimized uploadImageWithSizes implementation)
        const uploadResult = await processImageInThread(buffer);

        // create DB doc
        const parsedTags = parseTags(tags);
        const parsedCoords = validateCoordinates(coordinates);
        const categoryId = imageCategory; // already validated earlier in controller

        const imageDoc = await Image.create({
            imageUrl: uploadResult.imageUrl,
            thumbnailUrl: uploadResult.thumbnailUrl,
            smallUrl: uploadResult.smallUrl,
            regularUrl: uploadResult.regularUrl,
            imageAvifUrl: uploadResult.imageAvifUrl,
            publicId: uploadResult.publicId,
            imageTitle: imageTitle.substring(0, 255),
            imageCategory: categoryId,
            uploadedBy: userId,
            location: location?.trim() || undefined,
            coordinates: parsedCoords,
            cameraMake: exifData.cameraMake || undefined,
            cameraModel: exifData.cameraModel || cameraModel?.trim() || undefined,
            focalLength: exifData.focalLength || undefined,
            aperture: exifData.aperture || undefined,
            shutterSpeed: exifData.shutterSpeed || undefined,
            iso: exifData.iso || undefined,
            dominantColors: dominantColors.length ? dominantColors : undefined,
            tags: parsedTags.length ? parsedTags : undefined,
            moderationStatus: isAdmin ? 'approved' : 'pending',
            isModerated: !!isAdmin,
            ...(isAdmin ? { moderatedAt: new Date(), moderatedBy: userId } : {})
        });

        // clear listing cache (safe)
        try { await Promise.resolve(require('../middlewares/cacheMiddleware').clearCache('/api/images')); } catch (e) { }

        // delete raw upload
        deleteObjectByKey(uploadKey).catch(e => logger.warn('Failed to delete raw upload', e.message));

        // notify user
        Notification.create({ recipient: userId, type: 'upload_completed', image: imageDoc._id }).catch(() => { });

        return { success: true, imageId: imageDoc._id };
    } catch (err) {
        logger.error('Image processing job failed', { err: err.message, jobId: job.id });
        // notify user of failure
        Notification.create({ recipient: userId, type: 'upload_failed', metadata: { error: err.message } }).catch(() => { });
        throw err;
    }
}, { connection });

// optional: worker event logs
worker.on('completed', job => logger.info('Job completed', { id: job.id }));
worker.on('failed', (job, err) => logger.error('Job failed', { id: job?.id, error: err?.message }));