import React, { useState } from 'react';
import { storage } from '@/firebase';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { Save, Trash2, ExternalLink, Image as ImageIcon, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const StorageTest = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [status, setStatus] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (re) => {
                setFile({
                    name: selectedFile.name,
                    dataUrl: re.target.result
                });
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setStatus('Uploading...');
        try {
            const timestamp = Date.now();
            const fileName = `test_${timestamp}_${file.name}`;
            const storageRef = ref(storage, `test/admin/${fileName}`);

            // Using uploadString for consistency with our services
            const snapshot = await uploadString(storageRef, file.dataUrl, 'data_url');
            const url = await getDownloadURL(snapshot.ref);

            setDownloadUrl(url);
            setStatus('Upload successful!');
        } catch (error) {
            console.error('Upload failed:', error);
            setStatus(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!downloadUrl) return;
        setUploading(true);
        setStatus('Deleting...');
        try {
            const storageRef = ref(storage, downloadUrl);
            await deleteObject(storageRef);
            setDownloadUrl('');
            setFile(null);
            setStatus('Delete successful!');
        } catch (error) {
            console.error('Delete failed:', error);
            setStatus(`Delete failed: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader title="Storage Integration Test" />

            <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem' }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '1rem',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>1. Select Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                        />
                    </div>

                    {file && (
                        <div style={{ marginTop: '1rem' }}>
                            <img
                                src={file.dataUrl}
                                alt="Preview"
                                style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '0.5rem', border: '1px solid #eee' }}
                            />
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                style={{
                                    marginTop: '1rem',
                                    width: '100%',
                                    padding: '0.75rem',
                                    backgroundColor: '#4f46e5',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    opacity: uploading ? 0.7 : 1
                                }}
                            >
                                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Upload to Cloud Storage
                            </button>
                        </div>
                    )}

                    {downloadUrl && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '0.5rem',
                            border: '1px solid #bbf7d0'
                        }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#166534' }}>2. Result URL</label>
                            <div style={{ display: 'flex', gap: '0.5rem', wordBreak: 'break-all', fontSize: '0.875rem' }}>
                                <code>{downloadUrl}</code>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    onClick={() => window.open(downloadUrl, '_blank')}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        backgroundColor: 'white',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.4rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <ExternalLink size={16} /> Open URL
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={uploading}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        backgroundColor: '#fee2e2',
                                        color: '#991b1b',
                                        border: '1px solid #fecaca',
                                        borderRadius: '0.4rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Trash2 size={16} /> Delete from Storage
                                </button>
                            </div>
                        </div>
                    )}

                    {status && (
                        <div style={{
                            textAlign: 'center',
                            fontSize: '0.875rem',
                            color: status.includes('failed') ? '#991b1b' : '#374151',
                            fontWeight: 500
                        }}>
                            {status}
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#1e40af' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Rule Check Instructions:</h4>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                            <li>Upload an image and copy the URL.</li>
                            <li>Open the URL in an Incognito window.</li>
                            <li>If it opens, <b>test path</b> is public (Correct).</li>
                            <li>If you try manually changing path to <b>transactions/</b> in URL, it should fail (Correct).</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StorageTest;
