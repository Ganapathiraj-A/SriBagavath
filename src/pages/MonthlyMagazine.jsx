import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Folder, ChevronLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useDriveFiles } from '@/hooks/useDriveFiles';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

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
                backgroundColor: 'var(--color-card)',
                borderRadius: '0.75rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
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
                backgroundColor: 'var(--color-primary-transparent)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Folder size={24} color="var(--color-primary)" />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-text)' }}>{title}</span>
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
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}
        >
            <FileText size={18} color="var(--color-text-light)" />
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
    const { driveMagazineId } = useGlobalSettings();
    const folderIdParam = searchParams.get('folderId');
    const currentFolderId = folderIdParam || driveMagazineId;

    // Use history specific to this component flow is no longer needed as browser history handles it
    // But we might want to check if we can go back specifically within the folder structure?
    // Actually, simple navigate(-1) works if we push state for each folder.


    const { files: driveFiles, loading, error } = useDriveFiles(currentFolderId, 'monthly_magazine');

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
            // Both have valid months, sort by month index ascending
            if (idxA !== idxB) return idxA - idxB;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        }

        // Prioritize items WITH months over items WITHOUT
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;

        // Fallback to descending natural sort (useful for years)
        return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
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
            <PageHeader title="Monthly Magazine" />
            <div style={{ maxWidth: '28rem', margin: '0 auto' }}>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'var(--color-card)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--color-border)'
                    }}
                >


                    {loading ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>Loading...</div>
                    ) : error ? (
                        <div style={{
                            padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid var(--color-error)', borderRadius: '0.5rem',
                            color: 'var(--color-error)', fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Files List */}
                            {files.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Files</h2>
                                    {files.map(file => (
                                        <FileLink key={file.id} file={file} />
                                    ))}
                                </div>
                            )}

                            {/* Folders List */}
                            {folders.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Folders</h2>
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
                                <div style={{ textAlign: 'center', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
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
