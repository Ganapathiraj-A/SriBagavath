import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, BookOpen } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { useAdminAuth } from '@/context/AdminAuthContext';

const DigitalBookSettings = () => {
    const navigate = useNavigate();
    const { hasAccess } = useAdminAuth();
    const { digitalBookLanguages, setDigitalBookLanguages } = useGlobalSettings();

    const [newLangName, setNewLangName] = useState('');
    const [newLangFolderId, setNewLangFolderId] = useState('');

    if (!hasAccess('DIGITAL_BOOKS_MANAGEMENT')) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-error)' }}>
                You do not have permission to view this page.
            </div>
        );
    }

    const handleSaveLanguageArray = async (newArray) => {
        try {
            await setDigitalBookLanguages(newArray);
        } catch (error) {
            console.error("Failed to save language array:", error);
            alert("Failed to save. Check console.");
        }
    };

    const handleLanguageEdit = (index, field, value) => {
        const updated = [...(digitalBookLanguages || [])];
        // Don't auto-update ID when editing name to prevent breaking existing links
        updated[index] = { ...updated[index], [field]: value };
        handleSaveLanguageArray(updated);
    };

    const handleRemoveLanguage = (index) => {
        if (window.confirm("Remove this language tab?")) {
            const updated = [...(digitalBookLanguages || [])];
            updated.splice(index, 1);
            handleSaveLanguageArray(updated);
        }
    };

    const handleLanguageMove = (index, direction) => {
        const updated = [...(digitalBookLanguages || [])];
        if (index + direction < 0 || index + direction >= updated.length) return;
        const temp = updated[index];
        updated[index] = updated[index + direction];
        updated[index + direction] = temp;
        handleSaveLanguageArray(updated);
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

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Digital Books Settings"
                leftAction={
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} color="var(--color-text)" />
                    </button>
                }
                rightAction={
                    <button
                        onClick={() => navigate('/pdf-books')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--color-primary-transparent)',
                            color: 'var(--color-primary)',
                            border: '1px solid var(--color-primary)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                        }}
                    >
                        <BookOpen size={16} />
                        View Listing
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '48rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Add New Language Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    backgroundColor: 'var(--color-surface)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px dashed var(--color-primary)',
                }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>Add New Language</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '10px' }}>
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
                            cursor: 'pointer',
                            marginTop: '4px'
                        }}
                    >
                        <Plus size={18} /> Add Language
                    </button>
                </div>

                {/* Existing Languages List */}
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Configured Languages</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>The first two languages appear as Main Tabs. The rest appear in the 'Other Languages' dropdown.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {digitalBookLanguages && digitalBookLanguages.map((lang, idx) => (
                            <div key={lang.id || idx} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                backgroundColor: 'var(--color-surface)',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid var(--color-border)',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleLanguageMove(idx, -1)} disabled={idx === 0} style={{ padding: '8px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? 'transparent' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}><ArrowUp size={16} /></button>
                                        <button onClick={() => handleLanguageMove(idx, 1)} disabled={idx === digitalBookLanguages.length - 1} style={{ padding: '8px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: idx === digitalBookLanguages.length - 1 ? 'not-allowed' : 'pointer', color: idx === digitalBookLanguages.length - 1 ? 'transparent' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}><ArrowDown size={16} /></button>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', backgroundColor: idx < 2 ? 'var(--color-success-transparent)' : 'var(--color-background)', color: idx < 2 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                        {idx < 2 ? `Main Tab ${idx + 1}` : `Dropdown ${idx - 1}`}
                                    </div>
                                    <button onClick={() => handleRemoveLanguage(idx)} style={{ padding: '8px', background: 'var(--color-error-transparent)', color: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Language Name</span>
                                        <input
                                            type="text"
                                            value={lang.name}
                                            onChange={(e) => handleLanguageEdit(idx, 'name', e.target.value)}
                                            placeholder="e.g. Tamil"
                                            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Folder ID</span>
                                        <input
                                            type="text"
                                            value={lang.folderId}
                                            onChange={(e) => handleLanguageEdit(idx, 'folderId', e.target.value)}
                                            placeholder="Google Drive Folder ID"
                                            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!digitalBookLanguages || digitalBookLanguages.length === 0) && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                No languages configured. Add one above.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DigitalBookSettings;
