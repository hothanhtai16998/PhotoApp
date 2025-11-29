import React, { useState } from 'react';
import { uploadImageFull } from '../services/imageUploadService';

export default function ImageUploadTest() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [timing, setTiming] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setMessage(`Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select an image first');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('Starting upload...');
        setTiming(null);

        const uploadStart = Date.now();

        try {
            console.log('📤 Starting upload flow...');

            const result = await uploadImageFull(file, {
                imageTitle: file.name.replace(/\.[^/.]+$/, ''), // remove extension
                imageCategory: '507f1f77bcf86cd799439011', // ⚠️ Replace with valid category ID from your DB
                location: 'Test Location',
                cameraModel: 'Test Camera',
                coordinates: { latitude: 40.7128, longitude: -74.0060 },
                tags: ['test', 'upload'],
            });

            const totalTime = Date.now() - uploadStart;
            setTiming({ totalMs: totalTime });

            if (result.ok) {
                setMessage(`✅ Upload successful! Processed in ${totalTime}ms`);
                console.log('✅ Upload accepted, processing in background');
            } else {
                setError(`❌ Upload failed: ${result.error}`);
                console.error('❌ Error:', result.error);
            }
        } catch (err) {
            setError(`❌ Error: ${err.message}`);
            console.error('❌ Exception:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2>📸 Image Upload Test</h2>

            <div style={styles.inputGroup}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={loading}
                    style={styles.input}
                />
            </div>

            {file && (
                <div style={styles.fileInfo}>
                    <p><strong>File:</strong> {file.name}</p>
                    <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
                    <p><strong>Type:</strong> {file.type}</p>
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!file || loading}
                style={{
                    ...styles.button,
                    opacity: !file || loading ? 0.5 : 1,
                    cursor: !file || loading ? 'not-allowed' : 'pointer',
                }}
            >
                {loading ? '⏳ Uploading...' : '🚀 Upload Image'}
            </button>

            {message && (
                <div style={{ ...styles.message, color: '#28a745' }}>
                    {message}
                </div>
            )}

            {error && (
                <div style={{ ...styles.message, color: '#dc3545' }}>
                    {error}
                </div>
            )}

            {timing && (
                <div style={styles.timing}>
                    <h3>⏱️ Timing Results</h3>
                    <p><strong>Total upload time:</strong> {timing.totalMs}ms</p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                        (Expected: 3-5 seconds for preupload + S3 PUT + finalize)
                    </p>
                </div>
            )}

            <div style={styles.info}>
                <h4>ℹ️ What this test does:</h4>
                <ol>
                    <li>Calls <code>/api/images/preupload</code> → gets presigned S3 URL</li>
                    <li>PUTs file directly to S3 (this may take 1-3s depending on file size)</li>
                    <li>Calls <code>/api/images/finalize</code> → server enqueues background job</li>
                    <li>Returns 202 immediately (user sees success)</li>
                    <li>Background worker processes image (30-60s, check server logs)</li>
                </ol>
            </div>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '500px',
        margin: '40px auto',
        padding: '30px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        fontFamily: 'Arial, sans-serif',
    },
    inputGroup: {
        marginBottom: '20px',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '2px solid #007bff',
        borderRadius: '4px',
        boxSizing: 'border-box',
        cursor: 'pointer',
    },
    fileInfo: {
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
    },
    button: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginBottom: '20px',
    },
    message: {
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 'bold',
    },
    timing: {
        padding: '15px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        marginBottom: '20px',
    },
    info: {
        padding: '15px',
        backgroundColor: '#f0f0f0',
        border: '1px solid #999',
        borderRadius: '4px',
        fontSize: '13px',
    },
};