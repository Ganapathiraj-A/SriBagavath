import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Cloud, Save, Check, Copy, ExternalLink, Link as LinkIcon, Info
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const CopyableInput = ({ label, value, onChange, placeholder, type = "text", style = {} }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, ...style }}>
            {label && <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563', display: 'block' }}>{label}</label>}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        padding: '0.625rem',
                        paddingRight: '2.5rem',
                        fontSize: '0.875rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        color: '#111827',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                />
                <button
                    onClick={handleCopy}
                    style={{
                        position: 'absolute',
                        right: '8px',
                        padding: '4px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: copied ? '#10b981' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Copy to clipboard"
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
            </div>
        </div>
    );
};

const UrlSettings = () => {
    const navigate = useNavigate();
    const { role } = useAdminAuth();
    const {
        sheetLink, setSheetLink,
        scriptUrl, setScriptUrl,
        programImportUrl, setProgramImportUrl,
        programExportUrl, setProgramExportUrl,
        programUpdateUrl, setProgramUpdateUrl,
        bookImportUrl, setBookImportUrl,
        bookExportUrl, setBookExportUrl,
        bookUpdateUrl, setBookUpdateUrl,
        donationImportUrl, setDonationImportUrl,
        donationExportUrl, setDonationExportUrl,
        donationUpdateUrl, setDonationUpdateUrl,
        driveTamilBooksId,
        driveEnglishBooksId,
        driveMagazineId,
        driveAudioBooksId,
        onlineRegistrationContact,
        offlineRegistrationContact,
        setPublicSettings
    } = useGlobalSettings();

    if (role !== 'SUPER_ADMIN') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h3>Access Denied</h3>
                <p>Only Super Admins can access URL configurations.</p>
                <button onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    const savePublicSetting = async (key, value) => {
        try {
            const { db } = await import('../firebase');
            const { doc, setDoc } = await import('@/utils/FirestoreProxy');
            const publicDocRef = doc(db, 'settings', 'public');
            await setDoc(publicDocRef, { [key]: value }, { merge: true });
        } catch (_err) {
            console.error("Error saving public setting:", _err);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '3rem' }}>
            <PageHeader
                title="URL Configurations"
                leftAction={
                    <button onClick={() => navigate('/admin/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Core Services */}
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                        <LinkIcon size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Core Services</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                        <CopyableInput
                            label="Apps Script API URL"
                            value={scriptUrl}
                            onChange={(e) => setScriptUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/.../exec"
                        />
                        <CopyableInput
                            label="Master Spreadsheet Shared Link"
                            value={sheetLink}
                            onChange={(e) => setSheetLink(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                        />
                    </div>
                </div>

                {/* Google Drive Folder IDs */}
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                        <Cloud size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Google Drive Folders</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                        <CopyableInput
                            label="Tamil Books Folder"
                            value={driveTamilBooksId}
                            onChange={(e) => {
                                setPublicSettings(prev => ({ ...prev, driveTamilBooksId: e.target.value }));
                                savePublicSetting('driveTamilBooksId', e.target.value);
                            }}
                        />
                        <CopyableInput
                            label="English Books Folder"
                            value={driveEnglishBooksId}
                            onChange={(e) => {
                                setPublicSettings(prev => ({ ...prev, driveEnglishBooksId: e.target.value }));
                                savePublicSetting('driveEnglishBooksId', e.target.value);
                            }}
                        />
                        <CopyableInput
                            label="Monthly Magazine"
                            value={driveMagazineId}
                            onChange={(e) => {
                                setPublicSettings(prev => ({ ...prev, driveMagazineId: e.target.value }));
                                savePublicSetting('driveMagazineId', e.target.value);
                            }}
                        />
                        <CopyableInput
                            label="Audio Books Folder"
                            value={driveAudioBooksId}
                            onChange={(e) => {
                                setPublicSettings(prev => ({ ...prev, driveAudioBooksId: e.target.value }));
                                savePublicSetting('driveAudioBooksId', e.target.value);
                            }}
                        />
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                        <Info size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Public Information</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem' }}>
                        <CopyableInput
                            label="Online Registration Contact"
                            value={onlineRegistrationContact}
                            onChange={(e) => {
                                setPublicSettings(prev => ({ ...prev, onlineRegistrationContact: e.target.value }));
                                savePublicSetting('onlineRegistrationContact', e.target.value);
                            }}
                            placeholder="e.g., 7904118421"
                        />
                        <CopyableInput
                            label="Offline Registration Contact"
                            value={offlineRegistrationContact}
                            onChange={(e) => {
                                setPublicSettings(prev => ({ ...prev, offlineRegistrationContact: e.target.value }));
                                savePublicSetting('offlineRegistrationContact', e.target.value);
                            }}
                            placeholder="e.g., 7904118421"
                        />
                    </div>
                </div>

                {/* Spreadsheet Tab Names */}
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                        <ExternalLink size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Spreadsheet Tab Mappings</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Programs */}
                        <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Programs Management</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <CopyableInput label="Import Tab" value={programImportUrl} onChange={(e) => setProgramImportUrl(e.target.value)} />
                                <CopyableInput label="Export Tab" value={programExportUrl} onChange={(e) => setProgramExportUrl(e.target.value)} />
                                <CopyableInput label="Update Tab" value={programUpdateUrl} onChange={(e) => setProgramUpdateUrl(e.target.value)} />
                            </div>
                        </div>

                        {/* Books */}
                        <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Books Management</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <CopyableInput label="Import Tab" value={bookImportUrl} onChange={(e) => setBookImportUrl(e.target.value)} />
                                <CopyableInput label="Export Tab" value={bookExportUrl} onChange={(e) => setBookExportUrl(e.target.value)} />
                                <CopyableInput label="Update Tab" value={bookUpdateUrl} onChange={(e) => setBookUpdateUrl(e.target.value)} />
                            </div>
                        </div>

                        {/* Donations */}
                        <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Donations Management</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <CopyableInput label="Import Tab" value={donationImportUrl} onChange={(e) => setDonationImportUrl(e.target.value)} />
                                <CopyableInput label="Export Tab" value={donationExportUrl} onChange={(e) => setDonationExportUrl(e.target.value)} />
                                <CopyableInput label="Update Tab" value={donationUpdateUrl} onChange={(e) => setDonationUpdateUrl(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Cloud size={14} /> Settings are synchronized across all devices
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UrlSettings;
