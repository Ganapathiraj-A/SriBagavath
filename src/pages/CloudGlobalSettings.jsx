import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Cloud, Landmark, Link as LinkIcon, Eye, EyeOff, LayoutDashboard } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { CopyableInput } from './AdminSettings'; // Assuming we export it or duplicate it

const CloudGlobalSettings = () => {
    const navigate = useNavigate();
    const {
        onlineTransactionsEnabled, toggleOnlineTransactions,
        bankPassword, setBankPassword,
        minAppVersion, setMinAppVersion,
        mandatoryClearCache, setMandatoryClearCache,
        appVersion
    } = useGlobalSettings();

    const [showBankPassword, setShowBankPassword] = useState(false);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Cloud Global Settings"
                leftAction={
                    <button onClick={() => navigate('/admin/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Manage application-wide settings synchronized globally via the cloud.
                </p>

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
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/admin/url-settings')}
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
                        backgroundColor: 'var(--color-info-transparent)',
                        color: 'var(--color-info)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <LinkIcon size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>URL Configurations</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Manage Sheets, Scripts & Drive Folder IDs</div>
                    </div>
                </motion.button>

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
                        value={bankPassword || ''}
                        onChange={(e) => setBankPassword(e.target.value)}
                        placeholder="Statement decryption key"
                        style={{ padding: '0.625rem', fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                    />
                </div>

                {/* Minimum App Version & Cache Clear */}
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Mandatory Version</label>
                            <button
                                onClick={() => setMinAppVersion(appVersion)}
                                style={{
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--color-primary-transparent)',
                                    color: 'var(--color-primary)',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Use current v{appVersion}
                            </button>
                        </div>
                        <CopyableInput
                            value={minAppVersion || ''}
                            onChange={(e) => setMinAppVersion(e.target.value)}
                            placeholder="e.g. 3.0.0"
                        />
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>Mandatory Clear Cache</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Clear local storage during forced update</div>
                        </div>
                        <div onClick={() => setMandatoryClearCache(!mandatoryClearCache)} style={{ width: '40px', height: '22px', backgroundColor: mandatoryClearCache ? 'var(--color-error)' : 'var(--color-border)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                            <div style={{ width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: mandatoryClearCache ? '20px' : '2px', transition: 'left 0.2s' }} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CloudGlobalSettings;
