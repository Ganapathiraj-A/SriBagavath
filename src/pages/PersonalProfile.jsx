import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Settings, Layers, Cpu, Copy } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const PersonalProfile = () => {
    const navigate = useNavigate();
    const {
        devMode, setDevMode,
        updateSource, setUpdateSource,
        serverUrl, setServerUrl,
        landingPage, setLandingPage,
        showApiCounter, setShowApiCounter,
        showDiagnosticLogs, setShowDiagnosticLogs,
        showImageVerificationAlert, setShowImageVerificationAlert,
        deviceId, isDeviceAuthorized, toggleDeviceAuthorization
    } = useGlobalSettings();

    const handleLandingPageChange = (e) => {
        setLandingPage(e.target.value);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Personal Profile"
                leftAction={
                    <button onClick={() => navigate('/admin/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
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
                            value={landingPage || '/'}
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
                                <input type="text" value={serverUrl || ''} onChange={(e) => setServerUrl(e.target.value)} placeholder="http://192.168.1.X:8080" style={{ padding: '0.625rem', fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }} />
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

                {/* Device Specific Debug Authorization (Admins Only) -> ONLY show if devMode is true */}
                {devMode && (
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
                )}

            </div>
        </div>
    );
};

export default PersonalProfile;
