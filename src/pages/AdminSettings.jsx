import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Layers,
    User,
    RefreshCw,
    BookOpen,
    Users,
    LayoutDashboard,
    Settings,
    Check,
    Video,
    Copy,
    ChevronRight,
    Cpu,
    Cloud,
    Landmark,
    Database,
    Link as LinkIcon,
    Eye,
    EyeOff
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
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
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

const SettingItem = ({ title, subtitle, icon: Icon, delay, onClick, color = 'var(--color-primary)', bgColor = 'var(--color-primary-transparent)' }) => {
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
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
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
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{subtitle}</div>}
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
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
        minAppVersion, setMinAppVersion,
        landingPage, setLandingPage,
        showApiCounter, setShowApiCounter,
        showDiagnosticLogs, setShowDiagnosticLogs,
        showImageVerificationAlert, setShowImageVerificationAlert,
        deviceId, isDeviceAuthorized, toggleDeviceAuthorization,
        setPublicSettings
    } = useGlobalSettings();

    const [showBankPassword, setShowBankPassword] = React.useState(false);

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
                    permission: ['PROGRAM_MANAGEMENT', 'CONSULTATION_MANAGEMENT', 'DAILY_ZOOM_MANAGEMENT'],
                    color: 'var(--color-primary)',
                    bgColor: 'var(--color-primary-transparent)'
                },
                {
                    id: 'BOOK_MANAGEMENT',
                    title: 'Book Management',
                    subtitle: 'Add books, descriptions & covers',
                    icon: BookOpen,
                    path: '/admin/books',
                    permission: 'BANKING',
                    color: 'var(--color-accent)',
                    bgColor: 'var(--color-accent-transparent)'
                },
                {
                    id: 'DIGITAL_BOOKS_LANGUAGES',
                    title: 'Digital Books Languages',
                    subtitle: 'Manage languages & folder IDs',
                    icon: BookOpen,
                    path: '/admin/digital-books-settings',
                    permission: 'DIGITAL_BOOKS_MANAGEMENT',
                    color: 'var(--color-primary)',
                    bgColor: 'var(--color-primary-transparent)'
                },
                {
                    id: 'MANAGE_USERS',
                    title: 'Manage Admins',
                    subtitle: 'Permission & Access Control',
                    icon: Users,
                    path: '/manage-users',
                    permission: 'MANAGE_USERS',
                    color: 'var(--color-error)',
                    bgColor: 'var(--color-error-transparent)'
                },
                {
                    id: 'RELATED_VIDEO_MANAGEMENT',
                    title: 'Related Videos',
                    subtitle: 'YouTube playlist links',
                    icon: Video,
                    path: '/admin/related-videos',
                    permission: 'RELATED_VIDEO_MANAGEMENT',
                    color: 'var(--color-error)',
                    bgColor: 'var(--color-error-transparent)'
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
                    permission: 'REPORTING',
                    color: 'var(--color-info)',
                    bgColor: 'var(--color-info-transparent)'
                },
                {
                    id: 'SYSTEM_MAINTENANCE',
                    title: 'System Maintenance',
                    subtitle: 'Clear local cache & reset sync registry',
                    icon: RefreshCw,
                    action: 'CLEAR_CACHE',
                    permission: 'REPORTING',
                    color: 'var(--color-error)',
                    bgColor: 'var(--color-error-transparent)'
                },
                {
                    id: 'MEDIA_MIGRATION',
                    title: 'Media Migration Utility',
                    subtitle: 'Bulk update legacy images to Cloud Storage',
                    icon: Database,
                    path: '/admin/media-migration',
                    permission: 'REPORTING',
                    color: 'var(--color-primary)',
                    bgColor: 'var(--color-primary-transparent)'
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
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
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
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0.5rem' }}>
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
                            <User size={16} color="var(--color-text-muted)" />
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Personal Profile
                            </h3>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                backgroundColor: 'var(--color-card)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.25rem'
                            }}
                        >
                            {/* Landing Page */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
                                        <Settings size={18} />
                                    </div>
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>Landing Page</div>
                                </div>
                                <select
                                    value={landingPage}
                                    onChange={handleLandingPageChange}
                                    style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.875rem', outline: 'none' }}
                                >
                                    <option value="/">Default Home</option>
                                    <option value="/configuration">Admin Home</option>
                                    <option value="/admin/back-office">Back Office</option>
                                </select>
                            </div>

                            {/* Dev Mode Toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
                                        <Layers size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>Developer Mode</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Show debug tools</div>
                                    </div>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                                    <input
                                        type="checkbox"
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                        checked={devMode}
                                        onChange={(e) => setDevMode(e.target.checked)}
                                    />
                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: devMode ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: '34px', transition: '.4s' }}></span>
                                    <span style={{ position: 'absolute', height: '16px', width: '16px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: devMode ? 'translateX(18px)' : 'translateX(0)' }}></span>
                                </label>
                            </div>

                            {/* Dev Sub-options */}
                            {devMode && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Update Source</div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {['auto', 'laptop', 'github'].map(source => (
                                                <button key={source} onClick={() => setUpdateSource(source)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', borderRadius: '0.375rem', border: '1px solid', borderColor: updateSource === source ? 'var(--color-primary)' : 'var(--color-border)', backgroundColor: updateSource === source ? 'var(--color-primary-transparent)' : 'var(--color-surface)', color: updateSource === source ? 'var(--color-primary)' : 'var(--color-text)', textTransform: 'capitalize' }}>
                                                    {source}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Local Server IP</div>
                                        <input type="text" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="http://192.168.1.X:8080" style={{ padding: '0.625rem', fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
                                    </div>

                                    {/* API Counter Toggle */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Show API Counter</div>
                                        <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                                            <input
                                                type="checkbox"
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                checked={showApiCounter}
                                                onChange={(e) => setShowApiCounter(e.target.checked)}
                                            />
                                            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showApiCounter ? 'var(--color-warning)' : 'var(--color-border)', borderRadius: '34px', transition: '.4s' }}></span>
                                            <span style={{ position: 'absolute', height: '14px', width: '14px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: showApiCounter ? 'translateX(16px)' : 'translateX(0)' }}></span>
                                        </label>
                                    </div>

                                    {/* Diagnostic Logs Toggle */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Show Diagnostic Logs</div>
                                        <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                                            <input
                                                type="checkbox"
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                checked={showDiagnosticLogs}
                                                onChange={(e) => setShowDiagnosticLogs(e.target.checked)}
                                            />
                                            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showDiagnosticLogs ? 'var(--color-success)' : 'var(--color-border)', borderRadius: '34px', transition: '.4s' }}></span>
                                            <span style={{ position: 'absolute', height: '14px', width: '14px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: showDiagnosticLogs ? 'translateX(16px)' : 'translateX(0)' }}></span>
                                        </label>
                                    </div>

                                    {/* Image Verification Alert Toggle */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Image Verification Alert</div>
                                        <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                                            <input
                                                type="checkbox"
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                checked={showImageVerificationAlert}
                                                onChange={(e) => setShowImageVerificationAlert(e.target.checked)}
                                            />
                                            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showImageVerificationAlert ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: '34px', transition: '.4s' }}></span>
                                            <span style={{ position: 'absolute', height: '14px', width: '14px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: showImageVerificationAlert ? 'translateX(16px)' : 'translateX(0)' }}></span>
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
                                backgroundColor: 'var(--color-card)',
                                borderRadius: '1rem',
                                padding: '1.25rem',
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                marginTop: '1rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Cpu size={16} color="var(--color-text-muted)" />
                                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                    This Device Authorization
                                </h4>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-background)', padding: '0.75rem', borderRadius: '0.5rem', wordBreak: 'break-all', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
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
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>Anonymous Debugging</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Keep debug tools visible after logout</div>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                                    <input
                                        type="checkbox"
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                        checked={isDeviceAuthorized}
                                        onChange={(e) => toggleDeviceAuthorization(e.target.checked)}
                                    />
                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isDeviceAuthorized ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: '34px', transition: '.4s' }}></span>
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
                            <Cloud size={16} color="var(--color-primary)" />
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Cloud Global Settings
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Minimum App Version */}
                            <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <CopyableInput
                                    label="Force Update Version"
                                    value={minAppVersion}
                                    onChange={(e) => setMinAppVersion(e.target.value)}
                                    placeholder="e.g. 3.0.0"
                                />
                            </div>

                            {/* Online Transactions */}
                            <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: onlineTransactionsEnabled ? 'var(--color-success-transparent)' : 'var(--color-error-transparent)', color: onlineTransactionsEnabled ? 'var(--color-success)' : 'var(--color-error)' }}>
                                        <Landmark size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>Online Payments</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{onlineTransactionsEnabled ? 'Enabled for all users' : 'Disabled / Offline mode'}</div>
                                    </div>
                                </div>
                                <div onClick={() => toggleOnlineTransactions(!onlineTransactionsEnabled)} style={{ width: '40px', height: '22px', backgroundColor: onlineTransactionsEnabled ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                                    <div style={{ width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: onlineTransactionsEnabled ? '20px' : '2px', transition: 'left 0.2s' }} />
                                </div>
                            </div>

                            {/* URL Configurations Link */}
                            <SettingItem
                                title="URL Configurations"
                                subtitle="Manage Sheets, Scripts & Drive Folder IDs"
                                icon={LinkIcon}
                                delay={0.1}
                                onClick={() => navigate('/admin/url-settings')}
                                color="var(--color-info)"
                                bgColor="var(--color-info-transparent)"
                            />

                            {/* Bank Password */}
                            <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
                                        <LayoutDashboard size={18} />
                                    </div>
                                    <div style={{ flex: 1, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>Bank PDF Password</div>
                                    <button
                                        onClick={() => setShowBankPassword(!showBankPassword)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
                                    >
                                        {showBankPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <input
                                    type={showBankPassword ? "text" : "password"}
                                    value={bankPassword}
                                    onChange={(e) => setBankPassword(e.target.value)}
                                    placeholder="Statement decryption key"
                                    style={{ padding: '0.625rem', fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                />
                            </div>


                        </div>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Cloud size={12} /> Cloud Synchronized Settings & Profile
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
