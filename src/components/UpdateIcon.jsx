import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, CheckCircle, Smartphone, Wifi, Server, RefreshCw, Bot, Camera, FileSpreadsheet, ClipboardList, Layers } from 'lucide-react';
import UpdateService from '../services/UpdateService';
import { registerPlugin } from '@capacitor/core';

import { useAdminAuth } from '../context/AdminAuthContext';
import { useGlobalSettings } from '../context/GlobalSettingsContext';

// Bridge to our Native OCR Plugin which exposes 'installApk'
const OCR = registerPlugin('SBBOCR');

const UpdateIcon = () => {
    const { devMode: visible, updateSource, serverUrl } = useGlobalSettings();
    const { isAdmin, user } = useAdminAuth();

    // Feature Flag for Play Store builds
    const isUpdaterEnabled = import.meta.env.VITE_ENABLE_UPDATER === 'true';

    const navigate = useNavigate();

    const [updateInfo, setUpdateInfo] = useState(null); // { available: bool, source: string, releaseNotes: string, version: string }
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [currentVersion, setCurrentVersion] = useState('');
    const [companionVer, setCompanionVer] = useState('');

    const checkUpdate = async () => {
        try {
            const info = await UpdateService.checkForUpdate({ updateSource, serverUrl });
            // Show icon if we have ANY valid check result
            if (info && info.source) {
                setUpdateInfo(info);
            } else if (info && info.disabled) {
                console.warn("Updater disabled");
            }
        } catch (error) {
            console.error("Update check error", error);
        }
    };

    useEffect(() => {
        const fetchVer = async () => {
            const ver = await UpdateService.getCurrentVersion();
            setCurrentVersion(ver);

            // Fetch Companion Version
            try {
                if (OCR && OCR.getAppVersion) {
                    const res = await OCR.getAppVersion({ packageName: 'com.antigravity.companion' });
                    if (res && res.version) {
                        setCompanionVer(res.version);
                    }
                }
            } catch (e) { }
        };
        fetchVer();
    }, []);

    useEffect(() => {
        if (visible || currentVersion) {
            checkUpdate();
        }
    }, [visible, updateSource, serverUrl, currentVersion]); // Re-check if source/url changes or ver loaded

    // Timer for download duration
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let timer;
        if (isDownloading) {
            const startTime = Date.now();
            timer = setInterval(() => {
                setElapsed(Math.floor((Date.now() - startTime) / 1000));
                // Simulate progress if it's stuck at 0 (Native HTTP limitation)
                // Just for visual feedback that it IS working
                setProgress(old => {
                    if (old >= 95) return 95;
                    // Slow increment: 5% every second roughly?
                    return old + (Math.random() * 5);
                });
            }, 1000);
        } else {
            setElapsed(0);
            setProgress(0);
        }
        return () => clearInterval(timer);
    }, [isDownloading]);

    // Derived State and Guards
    const isDevBuild = !!currentVersion;
    const isVisible = (import.meta.env.DEV || isUpdaterEnabled) && (visible || isDevBuild);
    const isAuthorized = isDevBuild || (isAdmin && user && !user.isAnonymous);

    if (!isAuthorized || !isVisible) return null;

    const handleUpdate = async () => {
        if (!updateInfo) return;

        // If not strictly "new", ask user
        if (!updateInfo.available) {
            const proceed = window.confirm(`App is up to date (${updateInfo.currentVersion}).\nRe-install from ${updateInfo.source}?`);
            if (!proceed) return;
        }

        try {
            setIsDownloading(true);
            setStatusText('Downloading...');
            setProgress(0);

            // 1. Download
            // We pass a progress callback (approximate, if standard fetch supports streaming reader)
            const filePathUri = await UpdateService.triggerUpdate((pct) => {
                setProgress(pct * 100);
                setStatusText(`Downloading: ${(pct * 100).toFixed(0)}%`);
            });

            // 2. Install
            setStatusText('Installing...');

            // Bridge call
            if (OCR && OCR.installApk) {
                await OCR.installApk({ filePath: filePathUri });
            } else {
                alert("Install plugin not found. Please open file manually: " + filePathUri);
            }

            setIsDownloading(false);
            setStatusText('');

        } catch (error) {
            console.error("Update failed", error);
            setStatusText('Failed');
            setIsDownloading(false);
            alert("Update Failed: " + error.message);
        }
    }

    const handleProdUpdate = async () => {
        setStatusText("Checking Prod...");
        setIsDownloading(true);
        try {
            const info = await UpdateService.checkForProdUpdate();
            setIsDownloading(false);
            setStatusText("");

            if (info && info.downloadUrl) {
                const proceed = window.confirm(`Production Update Available (${info.version}).\nProceed to download and install?`);
                if (!proceed) return;

                setIsDownloading(true);
                setStatusText('Downloading Prod...');
                setProgress(0);

                const filePathUri = await UpdateService.triggerUpdate((pct) => {
                    setProgress(pct * 100);
                    setStatusText(`Downloading: ${(pct * 100).toFixed(0)}%`);
                });

                setStatusText('Installing...');
                if (OCR && OCR.installApk) {
                    await OCR.installApk({ filePath: filePathUri });
                } else {
                    alert("Install plugin not found: " + filePathUri);
                }
            } else {
                alert("No production APK found on GitHub 'prod-clean' tag.");
            }
        } catch (e) {
            console.error("Prod update failed", e);
            alert("Prod Update Failed: " + e.message);
        } finally {
            setIsDownloading(false);
            setStatusText("");
        }
    };

    if (isDownloading) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '80px', // Above the icon usually? Or replacing it? 
                // Request says "instead of the spinner icon", and the spinner replaced the button.
                // So this replaces the button.
                right: '32px', // Match icon position
                backgroundColor: 'white',
                padding: '12px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 9999,
                minWidth: '180px',
                border: '1px solid #e5e7eb'
            }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {updateInfo?.source === 'laptop' ? <Wifi size={14} color="#2563eb" /> : <Download size={14} color="#10b981" />}
                    From {updateInfo?.source === 'laptop' ? 'Laptop' : 'GitHub'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: '#111827', fontWeight: 'bold' }}>
                    <span>{Math.min(100, Math.floor(progress))}%</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' }}>{elapsed}s</span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '4px', backgroundColor: '#f3f4f6', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.min(100, progress)}%`,
                        backgroundColor: updateInfo?.source === 'laptop' ? '#2563eb' : '#10b981',
                        transition: 'width 0.5s ease'
                    }} />
                </div>

                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>
                    {statusText || "Downloading..."}
                </div>
            </div>
        );
    }

    const manualCheck = async () => {
        setStatusText("Checking...");
        setIsDownloading(true); // Re-use downloading state for spinner?
        try {
            const info = await UpdateService.checkForUpdate({ updateSource, serverUrl });
            setIsDownloading(false);
            setStatusText("");

            if (info && info.disabled) {
                alert("Updater Disabled: Package ID mismatch (Production Build?)");
            } else if (info && info.source) {
                setUpdateInfo(info);
            } else {
                alert("Check Failed:\n" + (info?.error || "No update source found."));
            }
        } catch (e) {
            setIsDownloading(false);
            setStatusText("");
            alert("Check failed: " + e.message);
        }
    };

    // Always show icon
    const hasInfo = !!updateInfo;
    const isUpToDate = hasInfo && !updateInfo.available;
    const SourceIcon = hasInfo ? (updateInfo.source === 'laptop' ? Wifi : Download) : RefreshCw;

    const launchAgent = async () => {
        try {
            await OCR.launchApp({ packageName: 'com.antigravity.companion' });
        } catch (e) {
            alert("Could not launch Agent Companion.\n" + e.message);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            transform: 'translateY(-50%)',
            right: '16px', // Slightly closer to edge for side-docked feel? Or keep 32px? User said "middle right". 32px is fine.
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px', // "Little bit space below"
            zIndex: 9998
        }}>
            {/* Update Icon */}
            <button
                onClick={hasInfo ? handleUpdate : manualCheck}
                style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: hasInfo ? (isUpToDate ? '#10b981' : '#2563eb') : '#9ca3af',
                    padding: '8px',
                    position: 'relative',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    width: '40px',
                    height: '40px'
                }}
                title={hasInfo ? (isUpToDate ? "App is Up to Date (Click to Reinstall)" : "Update Available") : "Check for Updates"}
            >
                <SourceIcon size={20} />
                {hasInfo && updateInfo.available && (
                    <span style={{
                        position: 'absolute', top: '0px', right: '0px', width: '10px', height: '10px',
                        backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white'
                    }} />
                )}
                {hasInfo && isUpToDate && (
                    <CheckCircle size={12} style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: 'white', borderRadius: '50%', color: '#10b981' }} />
                )}
            </button>
            <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600, marginTop: '-12px', background: 'white', padding: '2px 4px', borderRadius: '4px', border: '1px solid #eee' }}>
                v{currentVersion}
            </div>

            {/* Production Update Button */}
            <button
                onClick={handleProdUpdate}
                style={{
                    background: '#10b981', // Emerald/Prod Green
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    width: '36px',
                    height: '36px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
                title="Update to Latest Production"
            >
                <Server size={20} />
            </button>

            {/* Agent Companion Icon - Only visible in Dev Mode (Implicit since parent is gated) */}
            <button
                onClick={launchAgent}
                style={{
                    background: '#111827', // Dark theme for Agent
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a78bfa', // Purple tint
                    width: '36px',
                    height: '36px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
                title="Launch Agent Companion"
            >
                <Bot size={20} />
            </button>
            {companionVer && (
                <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, marginTop: '-12px', background: 'white', padding: '1px 3px', borderRadius: '4px', border: '1px solid #eee' }}>
                    v{companionVer}
                </div>
            )}

            {/* Save Screenshot (Dev) */}
            <button
                onClick={async () => {
                    try {
                        if (OCR && OCR.saveAndUploadScreenshot) {
                            // Construct Upload URL from Global Settings
                            // Default serverUrl is likely "http://192.168.1.X:8080"
                            // We need port 5000 for Agent Bridge
                            let uploadUrl = "http://192.168.1.7:5000/upload_base64"; // absolute fallback
                            if (serverUrl) {
                                // Replace port with 5000/upload_base64
                                uploadUrl = serverUrl.replace(/:\d+$/, ':5000') + '/upload_base64';
                            }

                            await OCR.saveAndUploadScreenshot({ url: uploadUrl });
                            alert("Screenshot Uploaded to " + uploadUrl.split('/')[2]);
                        } else {
                            alert("Native Plugin not ready.");
                        }
                    } catch (e) {
                        alert("Upload Failed: " + e.message);
                    }
                }}
                style={{
                    background: '#8B5CF6', // Violet
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    width: '36px',
                    height: '36px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
                title="Save Screenshot (WiFi Upload)"
            >
                <Camera size={20} />
            </button>

            {/* Import / Export Shortcut */}
            <button
                onClick={() => navigate('/admin/back-office/import-export')}
                style={{
                    background: '#059669', // Emerald/Green
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    width: '36px',
                    height: '36px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
                title="Import / Export Data"
            >
                <FileSpreadsheet size={20} />
            </button>

            {/* Registrations Review Shortcut */}
            <button
                onClick={() => navigate('/admin-review')}
                style={{
                    background: '#8b5cf6', // Violet/Purple (Matches Registration)
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    width: '36px',
                    height: '36px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
                title="Registration Review"
            >
                <ClipboardList size={20} />
            </button>

            {/* Attendance Shortcut */}
            <button
                onClick={() => navigate('/admin/back-office/programs')}
                style={{
                    background: '#f97316', // Orange (Matches Attendance Tracking in BackOffice)
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    width: '36px',
                    height: '36px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
                title="Attendance Tracking"
            >
                <Layers size={20} />
            </button>
        </div>
    );
};

export default UpdateIcon;
