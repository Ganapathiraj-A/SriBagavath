import React from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Layers,
    Save,
    User,
    Shield,
    Info,
    LogOut,
    ExternalLink,
    Smartphone,
    Code,
    Bug,
    Home,
    Layout,
    RefreshCw,
    Database,
    BookOpen,
    Users,
    LayoutDashboard,
    Settings,
    Check,
    CreditCard,
    Copy,
    ChevronRight,
    Cpu,
    Cloud,
    Landmark
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

const SettingItem = ({ title, subtitle, icon: Icon, delay, onClick, color = '#2563eb', bgColor = '#eff6ff' }) => { // eslint-disable-line no-unused-vars
    return (
        <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                textAlign: 'left'
            }}
        >
            <div style={{
                padding: '0.625rem',
                borderRadius: '0.5rem',
                backgroundColor: bgColor,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={20} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{subtitle}</div>}
            </div>
            <ChevronRight size={18} color="#9ca3af" />
        </motion.button>
    );
};

const AdminSettings = () => {
    const navigate = useNavigate();
    const { hasAccess, role } = useAdminAuth();

    // Settings (Cloud & Profile)
    const {
        onlineTransactionsEnabled, toggleOnlineTransactions,
        bankPassword, setBankPassword,
        devMode, setDevMode,
        updateSource, setUpdateSource,
        serverUrl, setServerUrl,
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
        minAppVersion, setMinAppVersion,
        landingPage, setLandingPage,
        showApiCounter, setShowApiCounter,
        showDiagnosticLogs, setShowDiagnosticLogs,
        deviceId, isDeviceAuthorized, toggleDeviceAuthorization,
        setPublicSettings
    } = useGlobalSettings();

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

    const handleLandingPageChange = (e) => {
        setLandingPage(e.target.value);
    };

    const sections = [
        {
            title: 'Management Hubs',
            items: [
                {
                    id: 'PROGRAM_MANAGEMENT',
                    title: 'Program Management',
                    subtitle: 'Retreats, Meetings, Satsang, Types & Consultation',
                    icon: Layers,
                    path: '/admin/program-management',
                    permission: ['PROGRAM_MANAGEMENT', 'PROGRAM_TYPES', 'CONSULTATION_MANAGEMENT', 'DAILY_ZOOM_MANAGEMENT'],
                    color: '#f97316',
                    bgColor: '#fff7ed'
                },
                {
                    id: 'BOOK_MANAGEMENT',
                    title: 'Book Management',
                    subtitle: 'Add books, descriptions & covers',
                    icon: BookOpen,
                    path: '/admin/books',
                    permission: 'ADMIN_REVIEW',
                    color: '#8b5cf6',
                    bgColor: '#f5f3ff'
                },
                {
                    id: 'MANAGE_USERS',
                    title: 'Manage Admins',
                    subtitle: 'Permission & Access Control',
                    icon: Users,
                    path: '/manage-users',
                    permission: 'MANAGE_USERS',
                    color: '#ec4899',
                    bgColor: '#fdf2f8'
                }
            ]
        },
        {
            title: 'Analytics & System',
            items: [
                {
                    id: 'ANALYTICS',
                    title: 'Analytics & Health',
                    subtitle: 'Usage stats, storage & system status',
                    icon: LayoutDashboard,
                    path: '/admin-dashboard',
                    permission: 'ADMIN_REVIEW',
                    color: '#06b6d4',
                    bgColor: '#ecfeff'
                },
                {
                    id: 'SYSTEM_MAINTENANCE',
                    title: 'System Maintenance',
                    subtitle: 'Clear local cache & reset sync registry',
                    icon: RefreshCw,
                    action: 'CLEAR_CACHE',
                    permission: 'ADMIN_REVIEW',
                    color: '#ef4444',
                    bgColor: '#fef2f2'
                }
            ]
        }
    ];

    const handleAction = async (item) => {
        if (item.action === 'CLEAR_CACHE') {
            if (window.confirm('This will clear all locally cached data and force a full resync from the server. Use this if you are seeing missing or incorrect content. Continue?')) {
                localStorage.clear();
                window.location.reload();
            }
            return;
        }
        navigate(item.path);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Settings"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {sections.map((section, sIdx) => {
                    const visibleItems = section.items.filter(item => {
                        if (Array.isArray(item.permission)) {
                            return item.permission.some(p => hasAccess(p));
                        }
                        return hasAccess(item.permission);
                    });

                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0.5rem' }}>
                                {section.title}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {visibleItems.map((item, iIdx) => (
                                    <SettingItem
                                        key={item.id}
                                        {...item}
                                        onClick={() => item.action ? handleAction(item) : navigate(item.path)}
                                        delay={(sIdx * 0.2) + (iIdx * 0.1)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Personal Profile Settings (Dev Options) */}
                {role !== 'POWER_USER' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0.5rem' }}>
                            <User size={16} color="#6b7280" />
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Personal Profile
                            </h3>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                                border: '1px solid #e5e7eb',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.25rem'
                            }}
                        >
                            {/* Landing Page */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: '#f3f4f6', color: '#374151' }}>
                                        <Settings size={18} />
                                    </div>
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>Landing Page</div>
                                </div>
                                <select
                                    value={landingPage}
                                    onChange={handleLandingPageChange}
                                    style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '0.875rem', outline: 'none' }}
                                >
                                    <option value="/">Default Home</option>
                                    <option value="/configuration">Admin Home</option>
                                    <option value="/admin/back-office">Back Office</option>
                                </select>
                            </div>

                            {/* Dev Mode Toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: '#f3f4f6', color: '#374151' }}>
                                        <Layers size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>Developer Mode</div>
                                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Show debug tools</div>
                                    </div>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                                    <input
                                        type="checkbox"
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                        checked={devMode}
                                        onChange={(e) => setDevMode(e.target.checked)}
                                    />
                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: devMode ? '#2563eb' : '#ccc', borderRadius: '34px', transition: '.4s' }}></span>
                                    <span style={{ position: 'absolute', height: '16px', width: '16px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: devMode ? 'translateX(18px)' : 'translateX(0)' }}></span>
                                </label>
                            </div>

                            {/* Dev Sub-options */}
                            {devMode && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px dashed #e5e7eb' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.5rem' }}>Update Source</div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {['auto', 'laptop', 'github'].map(source => (
                                                <button key={source} onClick={() => setUpdateSource(source)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', borderRadius: '0.375rem', border: '1px solid', borderColor: updateSource === source ? '#2563eb' : '#d1d5db', backgroundColor: updateSource === source ? '#eff6ff' : 'white', color: updateSource === source ? '#1d4ed8' : '#374151', textTransform: 'capitalize' }}>
                                                    {source}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Local Server IP</div>
                                        <input type="text" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="http://192.168.1.X:8080" style={{ padding: '0.625rem', fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', color: '#111827' }} />
                                    </div>

                                    {/* API Counter Toggle */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Show API Counter</div>
                                        <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                                            <input
                                                type="checkbox"
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                checked={showApiCounter}
                                                onChange={(e) => setShowApiCounter(e.target.checked)}
                                            />
                                            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showApiCounter ? '#f97316' : '#ccc', borderRadius: '34px', transition: '.4s' }}></span>
                                            <span style={{ position: 'absolute', height: '14px', width: '14px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: showApiCounter ? 'translateX(16px)' : 'translateX(0)' }}></span>
                                        </label>
                                    </div>

                                    {/* Diagnostic Logs Toggle */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Show Diagnostic Logs</div>
                                        <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                                            <input
                                                type="checkbox"
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                checked={showDiagnosticLogs}
                                                onChange={(e) => setShowDiagnosticLogs(e.target.checked)}
                                            />
                                            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showDiagnosticLogs ? '#10b981' : '#ccc', borderRadius: '34px', transition: '.4s' }}></span>
                                            <span style={{ position: 'absolute', height: '14px', width: '14px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: showDiagnosticLogs ? 'translateX(16px)' : 'translateX(0)' }}></span>
                                        </label>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>

                        {/* Device Specific Debug Authorization (Admins Only) */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '1rem',
                                padding: '1.25rem',
                                border: '1px solid #e5e7eb',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                marginTop: '1rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Cpu size={16} color="#6b7280" />
                                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                    This Device Authorization
                                </h4>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: '#6b7280', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', wordBreak: 'break-all', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ flex: 1 }}>ID: {deviceId}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(deviceId);
                                        alert("Device ID copied!");
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '4px' }}
                                >
                                    <Copy size={14} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>Anonymous Debugging</div>
                                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Keep debug tools visible after logout</div>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                                    <input
                                        type="checkbox"
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                        checked={isDeviceAuthorized}
                                        onChange={(e) => toggleDeviceAuthorization(e.target.checked)}
                                    />
                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isDeviceAuthorized ? '#2563eb' : '#ccc', borderRadius: '34px', transition: '.4s' }}></span>
                                    <span style={{ position: 'absolute', height: '16px', width: '16px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: isDeviceAuthorized ? 'translateX(18px)' : 'translateX(0)' }}></span>
                                </label>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Global Settings - Cloud Sync */}
                {role === 'SUPER_ADMIN' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0.5rem' }}>
                            <Cloud size={16} color="#2563eb" />
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Cloud Global Settings
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Minimum App Version */}
                            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <CopyableInput
                                    label="Force Update Version"
                                    value={minAppVersion}
                                    onChange={(e) => setMinAppVersion(e.target.value)}
                                    placeholder="e.g. 3.0.0"
                                />
                            </div>

                            {/* Online Transactions */}
                            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: onlineTransactionsEnabled ? '#dcfce7' : '#fee2e2', color: onlineTransactionsEnabled ? '#166534' : '#991b1b' }}>
                                        <Landmark size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>Online Payments</div>
                                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{onlineTransactionsEnabled ? 'Enabled for all users' : 'Disabled / Offline mode'}</div>
                                    </div>
                                </div>
                                <div onClick={() => toggleOnlineTransactions(!onlineTransactionsEnabled)} style={{ width: '40px', height: '22px', backgroundColor: onlineTransactionsEnabled ? '#2563eb' : '#e5e7eb', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                                    <div style={{ width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: onlineTransactionsEnabled ? '20px' : '2px', transition: 'left 0.2s' }} />
                                </div>
                            </div>

                            {/* Bank Password */}
                            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: '#f3f4f6', color: '#374151' }}>
                                        <LayoutDashboard size={18} />
                                    </div>
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>Bank PDF Password</div>
                                </div>
                                <input type="password" value={bankPassword} onChange={(e) => setBankPassword(e.target.value)} placeholder="Statement decryption key" style={{ padding: '0.625rem', fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', color: '#111827' }} />
                            </div>

                            {/* Functional URLs (Sheet, Script) */}
                            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <CopyableInput
                                            label="Apps Script URL"
                                            value={scriptUrl}
                                            onChange={(e) => setScriptUrl(e.target.value)}
                                        />
                                        <CopyableInput
                                            label="Master Sheet Link"
                                            value={sheetLink}
                                            onChange={(e) => setSheetLink(e.target.value)}
                                        />
                                    </div>

                                    {/* Google Drive Configuration */}
                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                            <Cloud size={16} color="var(--color-primary)" />
                                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563', margin: 0 }}>Google Drive Folders</h4>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <CopyableInput
                                                label="Tamil Books Folder"
                                                value={driveTamilBooksId}
                                                onChange={(e) => {
                                                    setPublicSettings(prev => ({ ...prev, driveTamilBooksId: e.target.value }));
                                                    savePublicSetting('driveTamilBooksId', e.target.value);
                                                }}
                                                style={{ fontSize: '0.7rem' }}
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

                                    {/* Sub-URLs Grid */}
                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #eee' }}>
                                        <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.75rem' }}>Import/Export Spreadsheet Tabs</h4>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                            {/* Programs */}
                                            <CopyableInput label="Prog. Import" value={programImportUrl} onChange={(e) => setProgramImportUrl(e.target.value)} />
                                            <CopyableInput label="Prog. Export" value={programExportUrl} onChange={(e) => setProgramExportUrl(e.target.value)} />
                                            <CopyableInput label="Prog. Update" value={programUpdateUrl} onChange={(e) => setProgramUpdateUrl(e.target.value)} />

                                            {/* Books */}
                                            <CopyableInput label="Book Import" value={bookImportUrl} onChange={(e) => setBookImportUrl(e.target.value)} />
                                            <CopyableInput label="Book Export" value={bookExportUrl} onChange={(e) => setBookExportUrl(e.target.value)} />
                                            <CopyableInput label="Book Update" value={bookUpdateUrl} onChange={(e) => setBookUpdateUrl(e.target.value)} />

                                            {/* Donations */}
                                            <CopyableInput label="Don. Import" value={donationImportUrl} onChange={(e) => setDonationImportUrl(e.target.value)} />
                                            <CopyableInput label="Don. Export" value={donationExportUrl} onChange={(e) => setDonationExportUrl(e.target.value)} />
                                            <CopyableInput label="Don. Update" value={donationUpdateUrl} onChange={(e) => setDonationUpdateUrl(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Cloud size={12} /> Cloud Synchronized Settings & Profile
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
