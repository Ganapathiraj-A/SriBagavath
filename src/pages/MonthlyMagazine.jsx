import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Folder } from 'lucide-react';
import { useDriveFiles } from '../hooks/useDriveFiles';
import { DRIVE_CONFIG } from '../data/driveConfig';

const { MONTHLY_MAGAZINE_FOLDER_ID } = DRIVE_CONFIG;

const FolderButton = ({ title, onClick, delay }) => {
    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.02, backgroundColor: 'var(--color-secondary)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                border: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '1rem',
                textAlign: 'left',
                cursor: 'pointer'
            }}
        >
            <div style={{
                padding: '0.75rem',
                borderRadius: '9999px',
                backgroundColor: '#fff7ed',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Folder size={24} color="var(--color-primary)" />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 500, color: '#1f2937' }}>{title}</span>
        </motion.button>
    );
};

const FileLink = ({ file }) => {
    const viewUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

    return (
        <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#1f2937',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}
        >
            <FileText size={18} color="#4b5563" />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
            </span>
        </a>
    );
};

const MonthlyMagazine = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Get folderId from URL or fallback to default
    const folderIdParam = searchParams.get('folderId');
    const currentFolderId = folderIdParam || MONTHLY_MAGAZINE_FOLDER_ID;

    // Use history specific to this component flow is no longer needed as browser history handles it
    // But we might want to check if we can go back specifically within the folder structure?
    // Actually, simple navigate(-1) works if we push state for each folder.


    const { files: driveFiles, loading, error } = useDriveFiles(currentFolderId);

    const handleFolderClick = (folderId) => {
        setSearchParams({ folderId });
    };

    const handleBackClick = () => {
        navigate(-1);
    };

    // Sorting Logic
    const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const MONTHS_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    // Tamil transliterations of Gregorian months
    const MONTHS_TAMIL = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

    const getMonthIndex = (name) => {
        if (!name) return -1;
        const lower = name.toLowerCase();

        // Check full names first
        let idx = MONTHS.findIndex(m => lower.includes(m));
        if (idx !== -1) return idx;

        // Check Tamil (Case insensitive not really needed but safe to check raw)
        idx = MONTHS_TAMIL.findIndex(m => name.includes(m));
        if (idx !== -1) return idx;

        // Check abbreviations (word boundary check is not easily done with simple includes, but months are usually distinct)
        // To avoid "Decade" matching "Dec", simple includes is risky but standard for this user context.
        idx = MONTHS_ABBR.findIndex(m => lower.includes(m));
        return idx;
    };

    const sortItems = (a, b) => {
        const idxA = getMonthIndex(a.name);
        const idxB = getMonthIndex(b.name);

        if (idxA !== -1 && idxB !== -1) {
            // Both have valid months, sort by month index
            if (idxA !== idxB) return idxA - idxB;
            // Same month? Sort by name (e.g. handle year if present or dupes)
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        }

        // Prioritize items WITH months over items WITHOUT
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;

        // Fallback to natural sort
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    };

    // Separate files and folders and apply sort
    const folders = driveFiles
        ? driveFiles.filter(item => item.mimeType === 'application/vnd.google-apps.folder').sort(sortItems)
        : [];

    const files = driveFiles
        ? driveFiles.filter(item => item.mimeType !== 'application/vnd.google-apps.folder').sort(sortItems)
        : [];

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            padding: '1.5rem'
        }}>
            <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
                    {!folderIdParam ? (
                    ) : (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleBackClick}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                color: '#374151',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5" />
                                <path d="M12 19l-7-7 7-7" />
                            </svg>
                        </motion.button>
                    )}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                    }}
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem', textAlign: 'center' }}>
                        Monthly Magazine
                    </h1>

                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#4b5563', padding: '2rem' }}>Loading...</div>
                    ) : error ? (
                        <div style={{
                            padding: '0.75rem', backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca', borderRadius: '0.5rem',
                            color: '#b91c1c', fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Files List */}
                            {files.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#4b5563' }}>Files</h2>
                                    {files.map(file => (
                                        <FileLink key={file.id} file={file} />
                                    ))}
                                </div>
                            )}

                            {/* Folders List */}
                            {folders.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#4b5563' }}>Folders</h2>
                                    {folders.map((folder, index) => (
                                        <FolderButton
                                            key={folder.id}
                                            title={folder.name}
                                            onClick={() => handleFolderClick(folder.id)}
                                            delay={index * 0.1}
                                        />
                                    ))}
                                </div>
                            )}

                            {files.length === 0 && folders.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                                    No files or folders found.
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default MonthlyMagazine;
