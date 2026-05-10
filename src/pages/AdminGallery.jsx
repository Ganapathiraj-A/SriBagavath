import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, X, ChevronUp, ChevronDown, Share2, Folder, FolderPlus, ArrowLeft, Eye, Download, Loader2, Settings, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp, where, writeBatch, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { shareImage } from '@/utils/shareUtils';
import PageHeader from '@/components/PageHeader';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

// Utility to check for HEIC files (offloaded to external apps)
const isHeic = (name = '', type = '') => {
    const n = (name || '').toLowerCase(); const t = (type || '').toLowerCase(); return n.endsWith('.heic') || n.endsWith('.heif') || n.endsWith('.hif') || t.includes('heic') || t.includes('heif');
};

const withTimeout = (promise, ms, message) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const resizeImageBlob = (blob, maxDim = 2000) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > height) {
                if (width > maxDim) {
                    height *= (maxDim / width);
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width *= (maxDim / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((result) => resolve(result || blob), 'image/jpeg', 0.85);
        };
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error("Image processing failed"));
        };
    });
};

const LocalFilePreview = ({ file }) => {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!file) return;

        if (isHeic(file.name, file.type)) {
            // Skip HEIC conversion for previews to prevent UI hangs
            return;
        } else {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    if (isHeic(file.name, file.type)) {
        return (
            <div style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: '#fee2e2', 
                borderRadius: '0.25rem',
                border: '1px solid #ef4444',
                padding: '0.2rem'
            }}>
                <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#b91c1c' }}>HEIC</span>
                <span style={{ fontSize: '0.35rem', color: '#b91c1c', textAlign: 'center' }}>Need JPG</span>
            </div>
        );
    }

    if (!previewUrl) return null;

    return (
        <img 
            src={previewUrl} 
            alt="Preview" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
    );
};

const AdminGallery = () => {
    const navigate = useNavigate();
    const { galleryTabLabels, setGalleryTabLabels } = useGlobalSettings();
    const [images, setImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ url: '', caption: '', order: 0, category: 'general' });
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [events, setEvents] = useState([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [newEventForm, setNewEventForm] = useState({ name: '', order: 0 });
    const [newForm, setNewForm] = useState({ url: '', caption: '', order: 0, category: 'general', eventId: '', customCategoryId: '' });
    const [galleryCategories, setGalleryCategories] = useState([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryForm, setNewCategoryForm] = useState({ name: '', order: 0 });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isBatchAdding, setIsBatchAdding] = useState(false);
    const [driveUrl, setDriveUrl] = useState('');
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    const cancelImportRef = useRef(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [uploadStartTime, setUploadStartTime] = useState(0);
    const [etaText, setEtaText] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const hasHeicSelection = selectedFiles.some(f => isHeic(f.name, f.type));
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [bulkMoveForm, setBulkMoveForm] = useState({ category: 'general', eventId: '', customCategoryId: '' });

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
        setActivityLogs(prev => [logEntry, ...prev].slice(0, 100)); // Keep last 100
        console.log(logEntry);
    };


    useEffect(() => {
        const qImages = query(collection(db, 'gallery'));
        const unsubscribe = onSnapshot(qImages, (snapshot) => {
            const loadedImages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            addLog(`🔄 Sync: Database sent ${loadedImages.length} images.`);

            // Tiered Sort (Null-Safe)
            const getTime = (ts) => {
                if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
                if (ts instanceof Date) return ts.getTime();
                if (typeof ts === 'number') return ts;
                if (typeof ts === 'string') return new Date(ts).getTime() || 0;
                return 0;
            };

            loadedImages.sort((a, b) => {
                const timeA = getTime(a.createdAt);
                const timeB = getTime(b.createdAt);
                if (timeB !== timeA) return timeB - timeA;
                
                const orderA = parseInt(a.order) || 0;
                const orderB = parseInt(b.order) || 0;
                if (orderA !== orderB) return orderA - orderB;
                
                return String(a.id).localeCompare(String(b.id));
            });

            setImages(loadedImages);
            setLoading(false);
        }, (error) => {
            console.error("Admin real-time sync failed:", error);
            setLoading(false);
        });

        fetchEvents();
        fetchCategories();

        return () => unsubscribe();
    }, []);

    const fetchEvents = async () => {
        try {
            const q = query(collection(db, 'gallery_events'));
            const snapshot = await getDocs(q);
            const loadedEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            loadedEvents.sort((a, b) => (a.order || 0) - (b.order || 0));
            setEvents(loadedEvents);
        } catch (error) {
            console.error("Error fetching gallery events:", error);
        }
    };
    
    const fetchCategories = async () => {
        try {
            const q = query(collection(db, 'gallery_categories'));
            const snapshot = await getDocs(q);
            const loadedCategories = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            loadedCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
            setGalleryCategories(loadedCategories);
        } catch (error) {
            console.error("Error fetching gallery categories:", error);
        }
    };

    const fetchImages = async () => {
        // Redundant with onSnapshot but kept for legacy manual calls
        // setLoading(true); // Don't block UI if synced
    };

    const formatETA = (seconds) => {
        if (!isFinite(seconds) || seconds < 0) return '0:00';
        
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFileUpload = async (file, isEdit = false, autoSave = false) => {
        if (!file) return;
        
        setIsUploading(true);
        setUploadProgress(0);
        const startTime = Date.now();
        setUploadStartTime(startTime);
        setEtaText('');
        
        let finalFile = file;
        let finalExt = file.name.split('.').pop();

        if (isHeic(file.name, file.type)) {
            alert("Uploading HEIC files is not directly supported. Please convert them to Jpeg before upload.");
            setIsUploading(false);
            return;
        } else {
            // Also resize standard images for stability if large
            try {
                if (file.size > 2 * 1024 * 1024) {
                    addLog(`📐 Optimizing large image: ${file.name}...`);
                    finalFile = await resizeImageBlob(file, 2000);
                }
            } catch (e) {
                console.warn("Standard resize failed", e);
            }
        }

        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${finalExt}`;
        const storagePath = `gallery/${fileName}`;
        const storageRef = ref(storage, storagePath);
        
        addLog(`↗️ Starting upload for: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        
        const uploadTask = uploadBytesResumable(storageRef, finalFile);
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);

                    const elapsed = (Date.now() - startTime) / 1000;
                    if (progress > 5) { // Wait for 5% to stabilize ETA
                        const totalEstimated = elapsed / (progress / 100);
                        setEtaText(` (${formatETA(elapsed)} / ${formatETA(totalEstimated)})`);
                    }
                }, 
                (error) => {
                    addLog(`❌ Upload failed: ${error.message}`, 'error');
                    setIsUploading(false);
                    alert("Upload failed: " + error.message);
                    reject(error);
                }, 
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        addLog(`✅ Upload successful: ${file.name}`);
                        
                        if (isEdit) {
                            setEditForm(prev => ({ ...prev, url: downloadURL, storagePath }));
                        } else {
                            // Update form state first
                            setNewForm(prev => {
                                const updatedForm = { ...prev, url: downloadURL, storagePath };
                                // If autoSave requested, we trigger handleAdd with the fresh state
                                if (autoSave) {
                                    setTimeout(() => {
                                        addLog(`💾 Auto-saving to database...`);
                                        handleAdd(updatedForm); 
                                    }, 100);
                                }
                                return updatedForm;
                            });
                        }
                        
                        setIsUploading(false);
                        resolve(downloadURL);
                    } catch (err) {
                        addLog(`❌ Error finalizing upload: ${err.message}`, 'error');
                        setIsUploading(false);
                        reject(err);
                    }
                }
            );
        });
    };

    const executeWithRetry = async (fn, label, maxAttempts = 5) => {
        let lastError;
        for (let i = 0; i < maxAttempts; i++) {
            if (cancelImportRef.current) break;
            try {
                return await fn();
            } catch (err) {
                lastError = err;
                console.warn(`[v4] ${label} attempt ${i + 1} failed:`, err.message);
                if (i < maxAttempts - 1 && !cancelImportRef.current) {
                    await new Promise(r => setTimeout(r, 3000));
                }
            }
        }
        throw lastError;
    };

    const handleCancel = () => {
        if (isUploading) {
            if (!confirm("Stop current upload process?")) return;
            cancelImportRef.current = true;
        }
        setShowAddModal(false);
        setDriveUrl('');
        setSelectedFiles([]);
        setUploadProgress(0);
        setEtaText('');
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const currentImages = getFilteredImages();
        if (selectedIds.length === currentImages.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(currentImages.map(img => img.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected images? This action cannot be undone.`)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            const imagesToDelete = images.filter(img => selectedIds.includes(img.id));
            
            selectedIds.forEach(id => {
                batch.delete(doc(db, 'gallery', id));
            });
            
            await batch.commit();

            const storagePromises = imagesToDelete
                .filter(img => img.storagePath)
                .map(img => {
                    const storageRef = ref(storage, img.storagePath);
                    return deleteObject(storageRef).catch(err => {
                        console.warn(`Could not delete storage file ${img.storagePath}:`, err);
                    });
                });
            
            await Promise.all(storagePromises);

            setSelectedIds([]);
            setIsSelectMode(false);
            alert(`Successfully deleted ${imagesToDelete.length} images.`);
        } catch (error) {
            console.error("Bulk delete failed:", error);
            alert("Error deleting images: " + error.message);
        } finally {
            setLoading(false);
        }
    };
    const handleBulkMove = async () => {
        if (selectedIds.length === 0) return;
        if (bulkMoveForm.category === 'events' && !bulkMoveForm.eventId) return alert("Please select a destination event folder");
        if (bulkMoveForm.category === 'others' && !bulkMoveForm.customCategoryId) return alert("Please select a destination category");

        setLoading(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                batch.update(doc(db, 'gallery', id), {
                    category: bulkMoveForm.category,
                    eventId: bulkMoveForm.category === 'events' ? bulkMoveForm.eventId : '',
                    customCategoryId: bulkMoveForm.category === 'others' ? bulkMoveForm.customCategoryId : '',
                    updatedAt: Timestamp.now()
                });
            });
            await batch.commit();
            addLog(`Bulk Move: Successfully moved ${selectedIds.length} images to ${bulkMoveForm.category}.`);
            
            setShowMoveModal(false);
            setSelectedIds([]);
            setIsSelectMode(false);
            alert(`Moved ${selectedIds.length} images successfully.`);
        } catch (error) {
            addLog(`Bulk Move failed: ${error.message}`, 'error');
            alert("Error moving images: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const extractFolderId = (url) => {
        const match = url.match(/[-\w]{25,}/);
        return match ? match[0] : null;
    };

    const handleDriveImport = async () => {
        const folderId = extractFolderId(driveUrl);
        if (!folderId) return alert("Please provide a valid Google Drive folder URL");

        if (!window.navigator.onLine) {
            return alert("Device is offline. Please check your internet connection and try again.");
        }

        setIsDriveLoading(true);
        setIsUploading(true);
        setUploadProgress(0);
        setUploadStartTime(Date.now());
        setEtaText('');
        cancelImportRef.current = false;

        try {
            const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
            const isNative = Capacitor.isNativePlatform();
            
            let driveFiles = [];
            
            addLog(`🔍 Drive Import: Scanning folder ${folderId}...`);
            driveFiles = await executeWithRetry(async () => {
                if (isNative) {
                    const response = await Capacitor.Plugins.CapacitorHttp.get({
                        url: 'https://www.googleapis.com/drive/v3/files',
                        params: {
                            key: apiKey,
                            q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
                            fields: 'files(id,name,mimeType,webContentLink)',
                        }
                    });
                    if (response.status !== 200) throw new Error(`Drive API error ${response.status}`);
                    return response.data.files || [];
                } else {
                    const params = new URLSearchParams({
                        key: apiKey,
                        q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
                        fields: 'files(id,name,mimeType,webContentLink)',
                    });
                    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
                    if (!res.ok) throw new Error("Could not access folder.");
                    const data = await res.json();
                    return data.files || [];
                }
            }, "Folder Scan");

            addLog(`📄 Drive Import: Found ${driveFiles.length} files.`);

            if (driveFiles.length === 0) {
                alert("No images found in this folder.");
                setIsDriveLoading(false);
                setIsUploading(false);
                return;
            }

            if (!confirm(`Found ${driveFiles.length} images. Start importing?`)) {
                setIsDriveLoading(false);
                setIsUploading(false);
                return;
            }

            const batch = writeBatch(db);
            let currentOrder = parseInt(newForm.order) || images.length;

            for (let i = 0; i < driveFiles.length; i++) {
                if (cancelImportRef.current) {
                    addLog("⏹️ Drive Import: Cancelled by user.");
                    break;
                }
                const file = driveFiles[i];
                addLog(`📥 Processing (${i+1}/${driveFiles.length}): ${file.name}`);

                let buffer = await executeWithRetry(async () => {
                    if (isNative) {
                        let dlRes = await Capacitor.Plugins.CapacitorHttp.get({
                            url: `https://www.googleapis.com/drive/v3/files/${file.id}`,
                            params: { alt: 'media', key: apiKey },
                            responseType: 'arraybuffer'
                        });

                        if (dlRes.status === 403 && file.webContentLink) {
                            dlRes = await Capacitor.Plugins.CapacitorHttp.get({
                                url: file.webContentLink,
                                responseType: 'arraybuffer'
                            });
                        }

                        if (dlRes.status !== 200) throw new Error(`Download failed (${dlRes.status})`);
                        return dlRes.data;
                    } else {
                        const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`);
                        if (!downloadRes.ok) throw new Error("Download failed");
                        const blob = await downloadRes.blob();
                        return await blob.arrayBuffer();
                    }
                }, `Download ${file.name}`);

                let finalData;
                let finalMimeType = file.mimeType || 'image/jpeg';
                let finalExtension = 'jpeg';

                let rawData;
                if (typeof buffer === 'string') {
                    const binaryString = window.atob(buffer);
                    rawData = new Uint8Array(binaryString.length);
                    for (let j = 0; j < binaryString.length; j++) {
                        rawData[j] = binaryString.charCodeAt(j);
                    }
                } else if (buffer instanceof ArrayBuffer) {
                    rawData = new Uint8Array(buffer);
                } else if (buffer && buffer.buffer instanceof ArrayBuffer) {
                    rawData = new Uint8Array(buffer.buffer);
                } else if (typeof buffer === 'object' && buffer !== null) {
                    const keys = Object.keys(buffer).filter(k => !isNaN(k)).map(Number).sort((a,b) => a-b);
                    if (keys.length > 0) {
                        rawData = new Uint8Array(keys.length);
                        for (let j = 0; j < keys.length; j++) {
                            rawData[j] = buffer[keys[j]];
                        }
                    }
                }

                if (!rawData || rawData.length === 0) {
                    throw new Error(`Invalid data received for ${file.name}`);
                }

                if (isHeic(file.name, file.mimeType)) {
                    addLog(`🔄 Converting HEIC to JPEG: ${file.name}`);
                    const heicBlob = new Blob([rawData], { type: 'image/heic' });
                    const jpegBlob = await convertHeicToJpeg(heicBlob);
                    const jpegArrayBuffer = await jpegBlob.arrayBuffer();
                    finalData = new Uint8Array(jpegArrayBuffer);
                    finalMimeType = 'image/jpeg';
                    finalExtension = 'jpg';
                    addLog(`✅ Conversion complete: ${file.name}`);
                } else {
                    finalData = rawData;
                    finalExtension = file.name.split('.').pop() || 'jpeg';
                }

                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${i}.${finalExtension}`;
                const storagePath = `gallery/${fileName}`;
                const storageRef = ref(storage, storagePath);
                const metadata = { contentType: finalMimeType };

                let downloadURL = await executeWithRetry(async () => {
                    const uploadTask = uploadBytesResumable(storageRef, finalData, metadata);
                    return new Promise((resolve, reject) => {
                        uploadTask.on('state_changed', 
                            (snapshot) => {
                                const fileProgress = snapshot.totalBytes > 0 
                                    ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 
                                    : 0;
                                const totalProgress = ((i + (fileProgress / 100)) / driveFiles.length) * 100;
                                setUploadProgress(totalProgress);

                                const elapsed = (Date.now() - uploadStartTime) / 1000;
                                if (totalProgress > 2) {
                                    const totalEstimated = elapsed / (totalProgress / 100);
                                    setEtaText(` (${formatETA(elapsed)} / ${formatETA(totalEstimated)})`);
                                }
                            },
                            reject,
                            async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                        );
                    });
                }, `Upload ${file.name}`);

                if (cancelImportRef.current) break;

                const newDocRef = doc(collection(db, 'gallery'));
                batch.set(newDocRef, {
                    ...newForm,
                    url: downloadURL,
                    storagePath,
                    caption: newForm.caption || file.name,
                    order: currentOrder + i,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });

                finalData = null;
            }

            if (!cancelImportRef.current) {
                addLog(`💾 Committing batch for ${driveFiles.length} images...`);
                await batch.commit();
                addLog("✨ Drive Import: Successfully completed.");
                setDriveUrl('');
                setShowAddModal(false);
                setNewForm(prev => ({
                    ...prev,
                    url: '',
                    caption: '',
                    order: 0,
                    category: activeTab,
                    eventId: activeTab === 'events' ? (selectedEventId || '') : '',
                    customCategoryId: activeTab === 'others' ? (newForm.customCategoryId || '') : ''
                }));

                const categoryLabel = galleryTabLabels[activeTab] || activeTab;
                alert(`Successfully imported ${driveFiles.length} images to "${categoryLabel}" tab!`);
            }
        } catch (error) {
            console.error("Drive import failed:", error);
            alert(`Drive import failed: ${error.message}`);
        } finally {
            setIsDriveLoading(false);
            setIsUploading(false);
            setUploadProgress(0);
        }
    };


    const handleAdd = async (arg = null) => {
        // If called from onClick, arg is the SyntheticEvent object.
        // We only treat it as a programmatic override if it has a 'url' property.
        const formOverride = (arg && arg.url) ? arg : null;
        const sourceForm = formOverride || newForm;

        if (selectedFiles.length > 0 && !formOverride) {
            return handleBatchAdd();
        }
        
        if (!sourceForm.url) return alert("URL is required");
        if (sourceForm.category === 'events' && !sourceForm.eventId) return alert("Please select an event folder");
        
        try {
            await addDoc(collection(db, 'gallery'), {
                ...sourceForm,
                order: parseInt(sourceForm.order) || 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            addLog(`✨ Firestore: Image record created successfully.`);
            setShowAddModal(false);
            setNewForm(prev => ({
                ...prev,
                url: '',
                caption: '',
                order: 0,
                category: activeTab,
                eventId: activeTab === 'events' ? (selectedEventId || '') : '',
                customCategoryId: activeTab === 'others' ? (newForm.customCategoryId || '') : ''
            }));
            
            if (!formOverride) {
                const categoryLabel = galleryTabLabels[sourceForm.category] || sourceForm.category;
                alert(`Successfully added image to "${categoryLabel}" tab!`);
            }
        } catch (error) {
            addLog(`Firestore Save failed: ${error.message}`, 'error');
            alert("Error adding image: " + error.message);
        }
    };

    const handleBatchAdd = async () => {
        if (selectedFiles.length === 0) return;
        if (newForm.category === 'events' && !newForm.eventId) return alert("Please select an event folder");

        setIsBatchAdding(true);
        setIsUploading(true);
        setUploadProgress(0);
        const startTime = Date.now();
        setUploadStartTime(startTime);
        setEtaText('');
        cancelImportRef.current = false;
        addLog(`↗️ Starting Resilient Batch Upload for ${selectedFiles.length} files...`);

        let successCount = 0;
        let failCount = 0;

        try {
            const firestoreBatch = writeBatch(db);
            let currentOrder = parseInt(newForm.order) || images.length;

            for (let i = 0; i < selectedFiles.length; i++) {
                if (cancelImportRef.current) break;
                const file = selectedFiles[i];
                addLog(`Parsing: ${file.name} | ${file.type}`);

                if (isHeic(file.name, file.type)) {
                    addLog(`Skipping HEIC: ${file.name}. Conversion required.`, 'warn');
                    continue;
                }

                let finalFile = file;
                let finalExt = file.name.split('.').pop();

                // 1. Preparation & Resizing
                try {
                    if (file.size > 2 * 1024 * 1024) { // Resize if > 2MB
                        setEtaText(` (Optimizing ${i + 1}/${selectedFiles.length}...)`);
                        finalFile = await resizeImageBlob(file, 2000);
                    }
                } catch (err) {
                    addLog(`⚠️ Process failed for ${file.name}, using original: ${err.message}`, 'warn');
                }

                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${i}.${finalExt}`;
                const storagePath = `gallery/${fileName}`;
                const storageRef = ref(storage, storagePath);
                
                // 2. Resilient Upload with Retries
                let downloadURL = null;
                let attempts = 0;
                const maxAttempts = 2;

                while (attempts < maxAttempts && !downloadURL) {
                    if (cancelImportRef.current) break;
                    attempts++;
                    try {
                        const uploadTask = uploadBytesResumable(storageRef, finalFile);
                        downloadURL = await new Promise((resolve, reject) => {
                            uploadTask.on('state_changed', 
                                (snapshot) => {
                                    const fileProgress = snapshot.totalBytes > 0 
                                        ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 
                                        : 0;
                                    const totalProgress = ((i + (fileProgress / 100)) / selectedFiles.length) * 100;
                                    setUploadProgress(totalProgress);

                                    const elapsed = (Date.now() - startTime) / 1000;
                                    if (totalProgress > 1) {
                                        const totalEstimated = elapsed / (totalProgress / 100);
                                        setEtaText(` (${formatETA(elapsed)} / ${formatETA(totalEstimated)})${attempts > 1 ? ` [Retry ${attempts - 1}]` : ''}`);
                                    }
                                },
                                (err) => {
                                    // Log full diagnostic info for storage/unknown errors
                                    const diag = err.serverResponse ? ` | Server: ${err.serverResponse}` : '';
                                    addLog(`❌ Storage Effort ${attempts} failed for ${file.name}: ${err.code}${diag}`, 'error');
                                    reject(err);
                                },
                                async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                            );
                        });
                    } catch (err) {
                        if (attempts >= maxAttempts) {
                            addLog(`🛑 Final failure for ${file.name} after ${attempts} attempts.`, 'error');
                        } else {
                            await new Promise(r => setTimeout(r, 1000)); // Cool down before retry
                        }
                    }
                }

                if (cancelImportRef.current) break;

                // 3. Track Batch Success
                if (downloadURL) {
                    const newDocRef = doc(collection(db, 'gallery'));
                    firestoreBatch.set(newDocRef, {
                        ...newForm,
                        url: downloadURL,
                        storagePath,
                        order: currentOrder + i,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    });
                    successCount++;
                } else {
                    failCount++;
                }
            }

            if (cancelImportRef.current) return;

            if (successCount > 0) {
                addLog(`💾 Committing results for ${successCount} images...`);
                await firestoreBatch.commit();
                addLog(`✨ Batch Finished: ${successCount} Success, ${failCount} Failed.`);
            }

            setSelectedFiles([]);
            setShowAddModal(false);
            setNewForm(prev => ({
                ...prev,
                url: '',
                caption: '',
                order: 0,
                category: activeTab,
                eventId: activeTab === 'events' ? (selectedEventId || '') : '',
                customCategoryId: activeTab === 'others' ? (newForm.customCategoryId || '') : ''
            }));

            if (failCount === 0) {
                alert(`Successfully added all ${successCount} images!`);
            } else {
                alert(`Upload partial: ${successCount} succeeded, ${failCount} failed. Check debug logs for details.`);
            }
        } catch (error) {
            console.error("Batch upload failed:", error);
            alert("Error adding images: " + error.message);
        } finally {
            setIsBatchAdding(false);
            setIsUploading(false);
            setUploadProgress(0);
        }
    };


    const handleUpdate = async (id) => {
        try {
            await updateDoc(doc(db, 'gallery', id), {
                ...editForm,
                order: parseInt(editForm.order) || 0,
                updatedAt: Timestamp.now()
            });
            setEditingId(null);
        } catch (error) {
            alert("Error updating image: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this image?")) return;
        try {
            await deleteDoc(doc(db, 'gallery', id));
        } catch (error) {
            alert("Error deleting image: " + error.message);
        }
    };

    const handleDownload = async (img) => {
        if (!img || !img.url) return;
        try {
            const response = await fetch(img.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', (img.caption || 'sri-bagavath-admin-gallery').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(img.url, '_blank');
        }
    };

    const handleMove = async (img, direction) => {
        const currentFiltered = getFilteredImages();
        const currentIndex = currentFiltered.findIndex(i => i.id === img.id);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        
        if (targetIndex < 0 || targetIndex >= currentFiltered.length) return;
        
        const neighbor = currentFiltered[targetIndex];
        
        try {
            await updateDoc(doc(db, 'gallery', img.id), { order: neighbor.order || 0, updatedAt: Timestamp.now() });
            await updateDoc(doc(db, 'gallery', neighbor.id), { order: img.order || 0, updatedAt: Timestamp.now() });
        } catch (error) {
            console.error("Error moving image:", error);
        }
    };

    const handleEdit = (img) => {
        setEditingId(img.id);
        setEditForm({ 
            url: img.url, 
            caption: img.caption || '', 
            order: img.order || 0,
            category: img.category || 'general',
            eventId: img.eventId || '',
            customCategoryId: img.customCategoryId || ''
        });
    };

    const getFilteredImages = () => {
        return images.filter(img => {
            const cat = (img.category || 'general').toLowerCase().trim();
            const targetTab = activeTab.toLowerCase().trim();
            
            if (targetTab === 'general') return cat === 'general';
            if (targetTab === 'ayya') return cat === 'ayya' || cat === 'ayyas photos';
            if (targetTab === 'events') {
                if (cat !== 'events') return false;
                return String(img.eventId || '') === String(selectedEventId || '');
            }
            if (targetTab === 'others') {
                if (cat !== 'others') return false;
                if (!selectedCategoryId) return true; // Show all 'others' if none selected
                return String(img.customCategoryId || '') === String(selectedCategoryId || '');
            }
            return false;
        });
    };

    const filteredImages = getFilteredImages();

    const handleCreateEvent = async () => {
        if (!newEventForm.name) return;
        try {
            await addDoc(collection(db, 'gallery_events'), {
                ...newEventForm,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            setNewEventForm({ name: '', order: events.length });
            setShowEventModal(false);
            fetchEvents();
        } catch (error) {
            alert("Error creating event: " + error.message);
        }
    };

    const handleDeleteEvent = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm("Are you sure? This will NOT delete images, but they will be unlinked from this event.")) return;
        try {
            await deleteDoc(doc(db, 'gallery_events', id));
            fetchEvents();
            if (selectedEventId === id) setSelectedEventId(null);
        } catch (error) {
            alert("Error deleting event: " + error.message);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryForm.name) return;
        try {
            await addDoc(collection(db, 'gallery_categories'), {
                ...newCategoryForm,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            setNewCategoryForm({ name: '', order: galleryCategories.length });
            fetchCategories();
        } catch (error) {
            alert("Error creating category: " + error.message);
        }
    };

    const handleDeleteCategory = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm("Are you sure? This will NOT delete images, but they will be unlinked from this category.")) return;
        try {
            await deleteDoc(doc(db, 'gallery_categories', id));
            fetchCategories();
        } catch (error) {
            alert("Error deleting category: " + error.message);
        }
    };

    const handleRenameContext = async (targetId = null) => {
        let currentId = targetId || 
            (activeTab === 'events' ? selectedEventId : 
            (activeTab === 'others' ? selectedCategoryId : null));
            
        let collectionName = 
            activeTab === 'events' ? 'gallery_events' : 
            (activeTab === 'others' ? 'gallery_categories' : null);
        
        if (!currentId || !collectionName) return;

        const record = (activeTab === 'events' ? events : galleryCategories).find(e => e.id === currentId);
        if (!record) return;
        
        const newName = prompt("Rename to:", record.name);
        if (!newName || newName === record.name) return;

        try {
            await updateDoc(doc(db, collectionName, currentId), {
                name: newName,
                updatedAt: Timestamp.now()
            });
            fetchEvents();
        } catch (error) {
            alert("Rename failed: " + error.message);
        }
    };

    const handleRenameTab = async (tabId) => {
        const currentLabel = galleryTabLabels[tabId] || '';
        const defaultLabels = {
            general: 'General',
            ayya: 'Ayyas Photos',
            events: 'Recent Events',
            others: 'Others'
        };
        const newLabel = prompt(`Rename "${currentLabel || defaultLabels[tabId]}" to:`, currentLabel || defaultLabels[tabId]);
        if (newLabel === null) return;
        
        try {
            await setGalleryTabLabels({
                ...galleryTabLabels,
                [tabId]: newLabel.trim()
            });
        } catch (error) {
            alert("Failed to rename tab: " + error.message);
        }
    };

    const getCurrentTitle = () => {
        if (activeTab === 'events' && selectedEventId) {
            return events.find(e => e.id === selectedEventId)?.name || 'Event';
        }
        const labels = {
            general: galleryTabLabels.general || 'General',
            ayya: galleryTabLabels.ayya || 'Ayyas Photos',
            events: galleryTabLabels.events || 'Recent Events',
            others: galleryTabLabels.others || 'Others'
        };
        return labels[activeTab] || '';
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', paddingBottom: '2rem' }}>
            <PageHeader 
                title="Gallery Management" 
                rightAction={
                    <button
                        onClick={() => navigate('/gallery')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '20px',
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Eye size={16} /> View Listing
                    </button>
                }
            />

            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '1rem', 
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                position: 'sticky',
                top: '56px',
                zIndex: 10,
                padding: '0 1rem',
                overflowX: 'auto'
            }}>
                {[
                    { id: 'general', default: 'General' },
                    { id: 'ayya', default: "Ayyas Photos" },
                    { id: 'events', default: 'Recent Events' },
                    { id: 'others', default: 'Others' }
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    const label = galleryTabLabels[tab.id] || tab.default;
                    return (
                        <div key={tab.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSelectedEventId(null);
                                    setSelectedCategoryId(null);
                                }}
                                style={{
                                    padding: '0.75rem 0.5rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {label}
                                {isActive && (
                                    <motion.div
                                        layoutId="adminGalleryTabUnderline"
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: '3px',
                                            backgroundColor: 'var(--color-primary)',
                                            borderRadius: '99px'
                                        }}
                                    />
                                )}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleRenameTab(tab.id); }}
                                style={{
                                    padding: '2px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    opacity: 0.6,
                                    marginLeft: '-4px'
                                }}
                                title="Rename Tab"
                            >
                                <Pencil size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{getCurrentTitle()}</h2>
                        {activeTab === 'events' && selectedEventId && (
                            <button 
                                onClick={() => handleRenameContext()}
                                style={{ 
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--color-primary)',
                                    backgroundColor: 'var(--color-primary-transparent)',
                                    color: 'var(--color-primary)', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                }}
                            >
                                <Pencil size={14} /> Rename Folder
                            </button>
                        )}
                        {activeTab === 'others' && selectedCategoryId && (
                            <button 
                                onClick={() => handleRenameContext()}
                                style={{ 
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--color-primary)',
                                    backgroundColor: 'var(--color-primary-transparent)',
                                    color: 'var(--color-primary)', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                }}
                            >
                                <Pencil size={14} /> Rename Category
                            </button>
                        )}
                        {activeTab === 'others' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <select
                                    value={selectedCategoryId || ''}
                                    onChange={e => setSelectedCategoryId(e.target.value || null)}
                                    style={{
                                        padding: '0.4rem 0.6rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--color-primary)',
                                        backgroundColor: 'var(--color-primary-transparent)',
                                        color: 'var(--color-primary)',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">-- All Categories --</option>
                                    {galleryCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => {
                            setNewForm(prev => ({ 
                                ...prev, 
                                order: images.length,
                                category: activeTab,
                                eventId: activeTab === 'events' ? (selectedEventId || '') : ''
                            }));
                            setShowAddModal(true);
                        }}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={20} /> Add Image
                    </button>

                    {activeTab === 'events' && !selectedEventId && (
                        <button
                            onClick={() => setShowEventModal(true)}
                            style={{
                                padding: '1rem',
                                backgroundColor: 'var(--color-success)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            <FolderPlus size={20} /> New Event
                        </button>
                    )}

                    <button
                        onClick={() => setShowCategoryModal(true)}
                        style={{
                            padding: '1rem',
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-primary)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Settings size={20} /> Categories
                    </button>
                </div>

                {/* Bulk Management Bar */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1.5rem', 
                    padding: '0.75rem', 
                    backgroundColor: isSelectMode ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-surface)', 
                    borderRadius: '0.75rem', 
                    border: `1px solid ${isSelectMode ? 'var(--color-error)' : 'var(--color-border)'}`,
                    transition: 'all 0.3s ease' 
                }}>
                    <button 
                        onClick={() => {
                            setIsSelectMode(!isSelectMode);
                            if (isSelectMode) setSelectedIds([]);
                        }}
                        style={{
                            background: isSelectMode ? 'var(--color-error)' : 'none',
                            border: `1px solid ${isSelectMode ? 'var(--color-error)' : 'var(--color-primary)'}`,
                            color: isSelectMode ? 'white' : 'var(--color-primary)',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {isSelectMode ? <X size={16} /> : <Settings size={16} />}
                        {isSelectMode ? 'Cancel Selection' : 'Select Mode'}
                    </button>

                    {isSelectMode && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button 
                                onClick={toggleSelectAll}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                {selectedIds.length === filteredImages.length ? 'Deselect All' : 'Select All'}
                            </button>
                            
                            {selectedIds.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        onClick={() => {
                                            setBulkMoveForm({ 
                                                category: activeTab, 
                                                eventId: selectedEventId || '', 
                                                customCategoryId: selectedCategoryId || '' 
                                            });
                                            setShowMoveModal(true);
                                        }}
                                        style={{
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}
                                    >
                                        <Folder size={16} /> Move ({selectedIds.length})
                                    </button>
                                    <button 
                                        onClick={handleDeleteSelected}
                                        style={{
                                            backgroundColor: 'var(--color-error)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}
                                >
                                    <Trash2 size={16} /> Delete ({selectedIds.length})
                                </button>
                                    </div>
                            )}
                        </div>
                    )}
                    {!isSelectMode && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                            {filteredImages.length} images
                        </div>
                    )}
                </div>

                {/* Main Content Areas */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: 'var(--color-text-muted)' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                            <Loader2 size={40} />
                        </motion.div>
                        <span>Loading gallery management...</span>
                    </div>
                ) : activeTab === 'events' && !selectedEventId ? (
                    /* Event Folder List */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        {events.map(event => (
                            <motion.div
                                key={event.id}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => setSelectedEventId(event.id)}
                                style={{
                                    backgroundColor: 'var(--color-card)',
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                            >
                                <Folder size={32} color="var(--color-primary)" fill="var(--color-primary-transparent)" />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, textAlign: 'center' }}>{event.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleRenameContext(event.id); }} style={{ position: 'absolute', top: '0.25rem', left: '0.25rem', background: 'none', border: 'none', color: 'var(--color-primary)' }}><Pencil size={14} /></button>
                                <button onClick={(e) => handleDeleteEvent(event.id, e)} style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'none', border: 'none', color: 'var(--color-error)' }}><Trash2 size={14} /></button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    /* Image Grid List */
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredImages.map((img) => (
                                <motion.div 
                                    key={img.id} 
                                    layout
                                    style={{
                                        backgroundColor: 'var(--color-card)',
                                        borderRadius: '0.75rem',
                                        border: `1px solid ${selectedIds.includes(img.id) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        padding: '1rem',
                                        display: 'flex',
                                        gap: '1rem',
                                        alignItems: 'center',
                                        cursor: isSelectMode ? 'pointer' : 'default'
                                    }}
                                    onClick={() => isSelectMode && toggleSelection(img.id)}
                                >
                                    {isSelectMode && (
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${selectedIds.includes(img.id) ? 'var(--color-primary)' : 'var(--color-border)'}`, backgroundColor: selectedIds.includes(img.id) ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {selectedIds.includes(img.id) && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'white' }} />}
                                        </div>
                                    )}
                                    <div style={{ width: '80px', height: '80px', borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0 }}>
                                        <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isSelectMode && !selectedIds.includes(img.id) ? 0.6 : 1 }} />
                                    </div>

                                    {editingId === img.id ? (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <input value={editForm.caption} onChange={e => setEditForm({ ...editForm, caption: e.target.value })} placeholder="Caption" style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)' }} />
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input type="number" value={editForm.order} onChange={e => setEditForm({ ...editForm, order: e.target.value })} placeholder="Order" style={{ width: '60px', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)' }} />
                                                <div style={{ flex: 1 }} />
                                                <button onClick={() => handleDelete(img.id)} style={{ padding: '0.5rem', color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={20} /></button>
                                                <button onClick={() => handleUpdate(img.id)} style={{ padding: '0.5rem', color: 'var(--color-success)', background: 'none', border: 'none', cursor: 'pointer' }}><Save size={20} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} style={{ padding: '0.5rem', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => !isSelectMode && handleEdit(img)}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.25rem' }}>{img.caption || 'No caption'}</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', backgroundColor: 'var(--color-primary-transparent)', color: 'var(--color-primary)', borderRadius: '0.25rem', textTransform: 'capitalize' }}>{img.category || 'general'}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>Order: {img.order || 0}</span>
                                            </div>
                                            {!isSelectMode && (
                                                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                                                    <button onClick={(e) => { e.stopPropagation(); handleMove(img, 'up'); }} style={{ padding: '0.25rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}><ChevronUp size={20} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleMove(img, 'down'); }} style={{ padding: '0.25rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}><ChevronDown size={20} /></button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                        
                        {/* Visibility Diagnostics */}
                        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <span>Total in DB: <b>{images.length}</b></span>
                            <span>Visible here: <b>{filteredImages.length}</b></span>
                            {images.length > filteredImages.length && (
                                <span style={{ color: 'var(--color-primary)' }}>Found <b>{images.length - filteredImages.length}</b> images in other tabs.</span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add Image Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={handleCancel}>
                        <motion.div initial={{ y: 20 }} animate={{ y: 0 }} style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1rem', width: '100%', maxWidth: '30rem' }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: '1rem' }}>Add New Gallery Image</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Image Source</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px dashed var(--color-primary)', backgroundColor: 'var(--color-primary-transparent)', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            <Plus size={18} /> {isUploading ? `Uploading ${Math.round(uploadProgress)}%${etaText}` : (selectedFiles.length > 0 ? `Selected ${selectedFiles.length} files` : 'Upload from Device')}
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={(e) => { const files = Array.from(e.target.files); if (files.length > 1) { setSelectedFiles(files); setNewForm(prev => ({ ...prev, url: 'multiple_files' })); } else if (files.length === 1) { setSelectedFiles([]); handleFileUpload(files[0], false, true); } }} multiple style={{ display: 'none' }} accept="image/*" />
                                    </div>

                                    {hasHeicSelection && (
                                        <div style={{ backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#c53030', lineHeight: '1.4' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <X size={14} /> HEIC Files Selected
                                            </div>
                                            Uploading HEIC files is not directly supported. Please convert them to Jpeg before upload. You can use apps similar to <a href="https://play.google.com/store/apps/details?id=com.tapuniverse.imageconverter" target="_blank" rel="noopener noreferrer" style={{ color: '#2b6cb0', fontWeight: 'bold', textDecoration: 'underline' }}>Image Converter (HEIC to JPG)</a> to do this.
                                        </div>
                                    )}

                                    {selectedFiles.length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                                            {selectedFiles.map((f, i) => (
                                                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                                                    <div style={{ width: '60px', height: '60px', borderRadius: '0.25rem', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                                        <LocalFilePreview file={f} />
                                                    </div>
                                                    <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={12} /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => setSelectedFiles([])} style={{ padding: '0.5rem', color: 'var(--color-error)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}>Clear All</button>
                                        </div>
                                    )}

                                    {selectedFiles.length === 0 && (
                                        <input value={newForm.url} onChange={e => setNewForm({ ...newForm, url: e.target.value })} placeholder="Or enter URL directly" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }} />
                                    )}

                                    {isUploading && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                            <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.3s ease' }} />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: '0.5rem', border: '1px solid var(--color-border)', marginTop: '0.75rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Import from Google Drive Folder</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input value={driveUrl} onChange={e => setDriveUrl(e.target.value)} placeholder="Paste Folder URL" disabled={isUploading} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', backgroundColor: 'white' }} />
                                            <button onClick={handleDriveImport} disabled={isUploading || !driveUrl} style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', cursor: (isUploading || !driveUrl) ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: (isUploading || !driveUrl) ? 0.7 : 1 }}>
                                                {isDriveLoading ? <Loader2 size={16} className="animate-spin" /> : 'Import'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Caption</label>
                                    <input value={newForm.caption} onChange={e => setNewForm({ ...newForm, caption: e.target.value })} placeholder="Enter image caption" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Display Order</label>
                                    <input type="number" value={newForm.order} onChange={e => setNewForm({ ...newForm, order: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Category</label>
                                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                        {['general', 'ayya', 'events', 'others'].map(cat => (
                                            <button key={cat} type="button" onClick={() => setNewForm({ ...newForm, category: cat })} style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', borderRadius: '0.4rem', border: `1px solid ${newForm.category === cat ? 'var(--color-primary)' : 'var(--color-border)'}`, backgroundColor: newForm.category === cat ? 'var(--color-primary-transparent)' : 'var(--color-card)', color: newForm.category === cat ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 600, textTransform: 'capitalize' }}>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    {newForm.category === 'events' && (
                                        <select value={newForm.eventId} onChange={e => setNewForm({ ...newForm, eventId: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-primary)', backgroundColor: 'var(--color-surface)' }}>
                                            <option value="">-- Select Event Folder --</option>
                                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                        </select>
                                    )}
                                    {newForm.category === 'others' && (
                                        <select value={newForm.customCategoryId} onChange={e => setNewForm({ ...newForm, customCategoryId: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-primary)', backgroundColor: 'var(--color-surface)' }}>
                                            <option value="">-- Select Category --</option>
                                            {galleryCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button onClick={handleCancel} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', background: 'none' }}>Cancel</button>
                                    <button onClick={handleAdd} disabled={isUploading} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, opacity: isUploading ? 0.7 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                                        {isBatchAdding ? `Saving ${selectedFiles.length} Images...` : (isUploading ? 'Processing...' : (selectedFiles.length > 0 ? `Add ${selectedFiles.length} Images` : 'Add Image'))}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Move Modal */}
            <AnimatePresence>
                {showMoveModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowMoveModal(false)}>
                        <motion.div initial={{ y: 20 }} animate={{ y: 0 }} style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1rem', width: '100%', maxWidth: '25rem' }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: '1.5rem' }}>Move {selectedIds.length} Images</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: 600 }}>Select Destination Category</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        {['general', 'ayya', 'events', 'others'].map(cat => (
                                            <button 
                                                key={cat} 
                                                onClick={() => setBulkMoveForm({ ...bulkMoveForm, category: cat })}
                                                style={{ 
                                                    padding: '0.75rem', 
                                                    borderRadius: '0.5rem', 
                                                    border: `1px solid ${bulkMoveForm.category === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                    backgroundColor: bulkMoveForm.category === cat ? 'var(--color-primary-transparent)' : 'white',
                                                    color: bulkMoveForm.category === cat ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                    fontWeight: 600,
                                                    textTransform: 'capitalize',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {bulkMoveForm.category === 'events' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Destination Folder</label>
                                        <select 
                                            value={bulkMoveForm.eventId} 
                                            onChange={e => setBulkMoveForm({ ...bulkMoveForm, eventId: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-primary)', backgroundColor: 'white' }}
                                        >
                                            <option value="">-- Select Event Folder --</option>
                                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {bulkMoveForm.category === 'others' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Destination Menu</label>
                                        <select 
                                            value={bulkMoveForm.customCategoryId} 
                                            onChange={e => setBulkMoveForm({ ...bulkMoveForm, customCategoryId: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-primary)', backgroundColor: 'white' }}
                                        >
                                            <option value="">-- Select Category --</option>
                                            {galleryCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button onClick={() => setShowMoveModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
                                    <button 
                                        onClick={handleBulkMove} 
                                        style={{ 
                                            flex: 2, 
                                            padding: '0.75rem', 
                                            borderRadius: '0.5rem', 
                                            border: 'none', 
                                            backgroundColor: 'var(--color-primary)', 
                                            color: 'white', 
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Move {selectedIds.length} Images
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Event Folder Modal */}
            <AnimatePresence>
                {showEventModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowEventModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1rem', width: '100%', maxWidth: '24rem', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Create Event Folder</h3>
                                <button onClick={() => setShowEventModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)' }}><X size={24} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Folder Name</label>
                                    <input autoFocus value={newEventForm.name} onChange={e => setNewEventForm({ ...newEventForm, name: e.target.value })} placeholder="e.g. Coimbatore Event 2024" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button onClick={() => setShowEventModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={handleCreateEvent} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Create Folder</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Category Modal */}
            <AnimatePresence>
                {showCategoryModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowCategoryModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1rem', width: '100%', maxWidth: '28rem', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Manage Sub-Categories</h3>
                                <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)' }}><X size={24} /></button>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <input value={newCategoryForm.name} onChange={e => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })} placeholder="Category Name" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
                                <button onClick={handleCreateCategory} style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Add</button>
                            </div>

                            <div style={{ maxHeight: '40vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {galleryCategories.map(cat => (
                                    <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                                        <span style={{ fontWeight: 500 }}>{cat.name}</span>
                                        <button onClick={(e) => handleDeleteCategory(cat.id, e)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminGallery;
