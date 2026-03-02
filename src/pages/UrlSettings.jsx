import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Cloud, Save, Check, Copy, ExternalLink, Link as LinkIcon, Info, Trash2, ArrowUp, ArrowDown, Plus, Edit2
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
            {label && <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block' }}>{label}</label>}
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
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        backgroundColor: 'var(--color-card)',
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
                        color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
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
        digitalBookLanguages,
        driveMagazineId,
        driveAudioBooksId,
        onlineRegistrationContact,
        offlineRegistrationContact,
        setPublicSettings
    } = useGlobalSettings();

    const [newLangName, setNewLangName] = React.useState('');
    const [newLangFolderId, setNewLangFolderId] = React.useState('');

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

    const handleSaveLanguageArray = (updated) => {
        setPublicSettings(prev => ({ ...prev, digitalBookLanguages: updated }));
        savePublicSetting('digitalBookLanguages', updated);
    };

    const handleAddLanguage = () => {
        if (!newLangName || !newLangFolderId) {
            alert("Please fill in Name and Folder ID");
            return;
        }
        const generatedId = newLangName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const updated = [...(digitalBookLanguages || []), { id: generatedId, name: newLangName, folderId: newLangFolderId }];
        handleSaveLanguageArray(updated);
        setNewLangName(''); setNewLangFolderId('');
    };

    const handleRemoveLanguage = (idx) => {
        if (!window.confirm("Are you sure you want to remove this language?")) return;
        const updated = [...digitalBookLanguages];
        updated.splice(idx, 1);
        handleSaveLanguageArray(updated);
    };

    const handleLanguageMove = (idx, direction) => {
        if (direction === -1 && idx === 0) return;
        if (direction === 1 && idx === digitalBookLanguages.length - 1) return;
        const updated = [...digitalBookLanguages];
        const temp = updated[idx];
        updated[idx] = updated[idx + direction];
        updated[idx + direction] = temp;
        handleSaveLanguageArray(updated);
    };

    const handleLanguageEdit = (idx, field, value) => {
        const updated = [...digitalBookLanguages];
        updated[idx][field] = value;
        handleSaveLanguageArray(updated);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '3rem' }}>
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
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                        <Cloud size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Google Drive Folders</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
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

                    {/* Dynamic Digital Books Configuration */}
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '1rem' }}>Digital Books Languages</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {digitalBookLanguages && digitalBookLanguages.map((lang, idx) => (
                                <div key={lang.id || idx} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    backgroundColor: 'var(--color-surface)',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--color-border)',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleLanguageMove(idx, -1)} disabled={idx === 0} style={{ padding: '6px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? 'transparent' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}><ArrowUp size={14} /></button>
                                            <button onClick={() => handleLanguageMove(idx, 1)} disabled={idx === digitalBookLanguages.length - 1} style={{ padding: '6px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: idx === digitalBookLanguages.length - 1 ? 'not-allowed' : 'pointer', color: idx === digitalBookLanguages.length - 1 ? 'transparent' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}><ArrowDown size={14} /></button>
                                        </div>
                                        <button onClick={() => handleRemoveLanguage(idx)} style={{ padding: '6px', background: 'var(--color-error-transparent)', color: 'var(--color-error)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Language Name</span>
                                            <input
                                                type="text"
                                                value={lang.name}
                                                onChange={(e) => handleLanguageEdit(idx, 'name', e.target.value)}
                                                placeholder="e.g. Tamil"
                                                style={{ width: '100%', padding: '10px', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Folder ID</span>
                                            <input
                                                type="text"
                                                value={lang.folderId}
                                                onChange={(e) => handleLanguageEdit(idx, 'folderId', e.target.value)}
                                                placeholder="Google Drive Folder ID"
                                                style={{ width: '100%', padding: '10px', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add New Language Section */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                backgroundColor: 'var(--color-surface)',
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px dashed var(--color-primary)',
                                marginTop: '10px'
                            }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>Add New Language</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                    <input
                                        type="text"
                                        value={newLangName}
                                        onChange={(e) => setNewLangName(e.target.value)}
                                        placeholder="Language Name (e.g. Hindi)"
                                        style={{ width: '100%', padding: '10px', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                                    />
                                    <input
                                        type="text"
                                        value={newLangFolderId}
                                        onChange={(e) => setNewLangFolderId(e.target.value)}
                                        placeholder="Google Drive Folder ID"
                                        style={{ width: '100%', padding: '10px', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                                    />
                                </div>
                                <button
                                    onClick={handleAddLanguage}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '10px',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={18} /> Add Language
                                </button>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Note: The first two languages will be shown as main tabs. The rest will appear in the &quot;Other Languages&quot; dropdown.</p>
                    </div>
                </div>

                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                        <ExternalLink size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Spreadsheet Tab Mappings</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Programs */}
                        <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Programs Management</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <CopyableInput label="Import Tab" value={programImportUrl} onChange={(e) => setProgramImportUrl(e.target.value)} />
                                <CopyableInput label="Export Tab" value={programExportUrl} onChange={(e) => setProgramExportUrl(e.target.value)} />
                                <CopyableInput label="Update Tab" value={programUpdateUrl} onChange={(e) => setProgramUpdateUrl(e.target.value)} />
                            </div>
                        </div>

                        {/* Books */}
                        <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Books Management</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <CopyableInput label="Import Tab" value={bookImportUrl} onChange={(e) => setBookImportUrl(e.target.value)} />
                                <CopyableInput label="Export Tab" value={bookExportUrl} onChange={(e) => setBookExportUrl(e.target.value)} />
                                <CopyableInput label="Update Tab" value={bookUpdateUrl} onChange={(e) => setBookUpdateUrl(e.target.value)} />
                            </div>
                        </div>

                        {/* Donations */}
                        <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Donations Management</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <CopyableInput label="Import Tab" value={donationImportUrl} onChange={(e) => setDonationImportUrl(e.target.value)} />
                                <CopyableInput label="Export Tab" value={donationExportUrl} onChange={(e) => setDonationExportUrl(e.target.value)} />
                                <CopyableInput label="Update Tab" value={donationUpdateUrl} onChange={(e) => setDonationUpdateUrl(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Cloud size={14} /> Settings are synchronized across all devices
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UrlSettings;
