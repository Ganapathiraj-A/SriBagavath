import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Phone, Globe, Home, Trash2, Plus, Info, Check
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const ContactsSettings = () => {
    const navigate = useNavigate();
    const { role } = useAdminAuth();
    const {
        onlineRegistrationContact,
        offlineRegistrationContact,
        generalContacts,
        contactWebsiteUrl,
        contactMapsUrl,
        contactBhavanAddressEn,
        contactBhavanAddressTa,
        contactOfficeAddressEn,
        contactOfficeAddressTa,
        setPublicSettings,
        setGeneralContacts
    } = useGlobalSettings();

    const [savingField, setSavingField] = React.useState(null);

    if (role !== 'SUPER_ADMIN') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-background)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <h3 style={{ color: 'var(--color-error)', fontSize: '1.5rem', marginBottom: '1rem' }}>Access Denied</h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Only Super Admins can access Contacts Management.</p>
                <button 
                    onClick={() => navigate(-1)}
                    style={{
                        padding: '0.5rem 1.5rem',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer'
                    }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    const savePublicSetting = async (key, value) => {
        setSavingField(key);
        try {
            const { db } = await import('../firebase');
            const { doc, setDoc } = await import('@/utils/FirestoreProxy');
            const publicDocRef = doc(db, 'settings', 'public');
            await setDoc(publicDocRef, { [key]: value }, { merge: true });
        } catch (_err) {
            console.error("Error saving public setting:", _err);
        } finally {
            setTimeout(() => setSavingField(null), 1000);
        }
    };

    const handleInputChange = (field, value) => {
        setPublicSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleInputBlur = (field, value) => {
        savePublicSetting(field, value);
    };

    const handleAddNumber = () => {
        const updated = [...(generalContacts || []), ''];
        setGeneralContacts(updated);
        savePublicSetting('generalContacts', updated);
    };

    const handleRemoveNumber = (idx) => {
        if (window.confirm("Remove this phone number?")) {
            const updated = [...generalContacts];
            updated.splice(idx, 1);
            setGeneralContacts(updated);
            savePublicSetting('generalContacts', updated);
        }
    };

    const handlePhoneChange = (idx, value) => {
        const updated = [...generalContacts];
        updated[idx] = value;
        setGeneralContacts(updated);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '3rem' }}>
            <PageHeader
                title="Contacts Management"
                leftAction={
                    <button onClick={() => navigate('/admin/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Registration Contacts */}
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                        <Phone size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Registration Hotlines</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Online Registration Contact</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={onlineRegistrationContact}
                                    onChange={(e) => handleInputChange('onlineRegistrationContact', e.target.value)}
                                    onBlur={(e) => handleInputBlur('onlineRegistrationContact', e.target.value)}
                                    placeholder="e.g., 7904118421"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem',
                                        fontSize: '0.875rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text)',
                                        backgroundColor: 'var(--color-background)',
                                        outline: 'none'
                                    }}
                                />
                                {savingField === 'onlineRegistrationContact' && (
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                        <Check size={16} />
                                    </span>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Offline Registration Contact</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={offlineRegistrationContact}
                                    onChange={(e) => handleInputChange('offlineRegistrationContact', e.target.value)}
                                    onBlur={(e) => handleInputBlur('offlineRegistrationContact', e.target.value)}
                                    placeholder="e.g., 7904118421"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem',
                                        fontSize: '0.875rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text)',
                                        backgroundColor: 'var(--color-background)',
                                        outline: 'none'
                                    }}
                                />
                                {savingField === 'offlineRegistrationContact' && (
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                        <Check size={16} />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* General Contact Numbers */}
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Info size={18} color="var(--color-primary)" />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>General Contact Numbers</h3>
                        </div>
                        <button
                            onClick={handleAddNumber}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'var(--color-primary-transparent)',
                                color: 'var(--color-primary)',
                                border: '1px solid var(--color-primary)',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.8rem'
                            }}
                        >
                            <Plus size={14} /> Add Number
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {generalContacts && generalContacts.map((phone, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => handlePhoneChange(idx, e.target.value)}
                                        onBlur={() => savePublicSetting('generalContacts', generalContacts)}
                                        placeholder="e.g., 9994205880"
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            fontSize: '0.875rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text)',
                                            backgroundColor: 'var(--color-background)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={() => handleRemoveNumber(idx)}
                                    style={{
                                        padding: '8px',
                                        backgroundColor: 'var(--color-error-transparent)',
                                        color: 'var(--color-error)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {(!generalContacts || generalContacts.length === 0) && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                                No general contact numbers configured.
                            </div>
                        )}
                    </div>
                </div>

                {/* Links & Map Config */}
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                        <Globe size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Links & Coordinates</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Website Link</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={contactWebsiteUrl}
                                    onChange={(e) => handleInputChange('contactWebsiteUrl', e.target.value)}
                                    onBlur={(e) => handleInputBlur('contactWebsiteUrl', e.target.value)}
                                    placeholder="https://sribagavath.org/"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem',
                                        fontSize: '0.875rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text)',
                                        backgroundColor: 'var(--color-background)',
                                        outline: 'none'
                                    }}
                                />
                                {savingField === 'contactWebsiteUrl' && (
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                        <Check size={16} />
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Google Maps Link</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={contactMapsUrl}
                                    onChange={(e) => handleInputChange('contactMapsUrl', e.target.value)}
                                    onBlur={(e) => handleInputBlur('contactMapsUrl', e.target.value)}
                                    placeholder="https://maps.app.goo.gl/..."
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem',
                                        fontSize: '0.875rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text)',
                                        backgroundColor: 'var(--color-background)',
                                        outline: 'none'
                                    }}
                                />
                                {savingField === 'contactMapsUrl' && (
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                        <Check size={16} />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Addresses */}
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                        <Home size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Addresses</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Bhavan Address */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: 'var(--color-primary)' }}>Sri Bagavath Bhavan Ashram</h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Ashram Address (English)</label>
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        value={contactBhavanAddressEn}
                                        onChange={(e) => handleInputChange('contactBhavanAddressEn', e.target.value)}
                                        onBlur={(e) => handleInputBlur('contactBhavanAddressEn', e.target.value)}
                                        placeholder="Enter English address..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            fontSize: '0.875rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text)',
                                            backgroundColor: 'var(--color-background)',
                                            outline: 'none',
                                            resize: 'vertical'
                                        }}
                                    />
                                    {savingField === 'contactBhavanAddressEn' && (
                                        <span style={{ position: 'absolute', right: '10px', bottom: '10px', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                            <Check size={16} />
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Ashram Address (Tamil)</label>
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        value={contactBhavanAddressTa}
                                        onChange={(e) => handleInputChange('contactBhavanAddressTa', e.target.value)}
                                        onBlur={(e) => handleInputBlur('contactBhavanAddressTa', e.target.value)}
                                        placeholder="முகவரியை தமிழில் உள்ளிடவும்..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            fontSize: '0.875rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text)',
                                            backgroundColor: 'var(--color-background)',
                                            outline: 'none',
                                            resize: 'vertical'
                                        }}
                                    />
                                    {savingField === 'contactBhavanAddressTa' && (
                                        <span style={{ position: 'absolute', right: '10px', bottom: '10px', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                            <Check size={16} />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Registered Office Address */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: 'var(--color-primary)' }}>Registered Office</h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Registered Office Address (English)</label>
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        value={contactOfficeAddressEn}
                                        onChange={(e) => handleInputChange('contactOfficeAddressEn', e.target.value)}
                                        onBlur={(e) => handleInputBlur('contactOfficeAddressEn', e.target.value)}
                                        placeholder="Enter English office address..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            fontSize: '0.875rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text)',
                                            backgroundColor: 'var(--color-background)',
                                            outline: 'none',
                                            resize: 'vertical'
                                        }}
                                    />
                                    {savingField === 'contactOfficeAddressEn' && (
                                        <span style={{ position: 'absolute', right: '10px', bottom: '10px', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                            <Check size={16} />
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Registered Office Address (Tamil)</label>
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        value={contactOfficeAddressTa}
                                        onChange={(e) => handleInputChange('contactOfficeAddressTa', e.target.value)}
                                        onBlur={(e) => handleInputBlur('contactOfficeAddressTa', e.target.value)}
                                        placeholder="அலுவலக முகவரியை தமிழில் உள்ளிடவும்..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            fontSize: '0.875rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text)',
                                            backgroundColor: 'var(--color-background)',
                                            outline: 'none',
                                            resize: 'vertical'
                                        }}
                                    />
                                    {savingField === 'contactOfficeAddressTa' && (
                                        <span style={{ position: 'absolute', right: '10px', bottom: '10px', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                            <Check size={16} />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default ContactsSettings;
