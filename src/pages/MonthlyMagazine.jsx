import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Folder } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useDriveFiles } from '@/hooks/useDriveFiles';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '@/utils/GoogleAuthUtils';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { TransactionService } from '@/services/TransactionService';
import { LogIn, Bookmark } from 'lucide-react';

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
    const [showSubscriptionOptions, setShowSubscriptionOptions] = useState(false);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'browse');
    const [subscriptions, setSubscriptions] = useState([]);
    const [subsLoading, setSubsLoading] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('lastVisited_magazines', Date.now().toString());
    }, []);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const ensureAuth = async () => {
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
            return true;
        }

        setAuthLoading(true);
        try {
            await ensureGoogleAuthInitialized();

            let idToken = null;
            if (Capacitor.isNativePlatform()) {
                const googleUser = await GoogleAuth.signIn();
                idToken = googleUser?.authentication?.idToken;
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                return true;
            }

            if (!idToken) throw new Error("No ID Token received");

            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
            return true;
        } catch (err) {
            console.error("Auth failed:", err);
            return false;
        } finally {
            setAuthLoading(false);
        }
    };

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

    const handleSubscribe = async (id, title, price) => {
        if (await ensureAuth()) {
            navigate('/bookstore-checkout', {
                state: {
                    cart: { [id]: 1 },
                    totalPrice: price,
                    items: [{ id, title, price, quantity: 1 }],
                    isMagazineSubscription: true
                }
            });
        }
    };

    useEffect(() => {
        if (activeTab === 'subscriptions' && auth.currentUser && !auth.currentUser.isAnonymous) {
            setSubsLoading(true);
            const unsubscribe = TransactionService.streamUserTransactions((data) => {
                const magSubs = (data || []).filter(tx => tx.itemType === 'MAGAZINE_SUBSCRIPTION');
                setSubscriptions(magSubs);
                setSubsLoading(false);
            });
            return () => unsubscribe();
        } else if (activeTab === 'subscriptions') {
            setSubscriptions([]);
            setSubsLoading(false);
        }
    }, [activeTab]);

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
            padding: showSubscriptionOptions ? '0' : '1.5rem'
        }}>
            {!showSubscriptionOptions && <PageHeader title="Monthly Magazine" />}

            {showSubscriptionOptions ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        minHeight: '100vh',
                        backgroundColor: 'var(--color-surface)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <PageHeader title="Select Subscription" />
                    <div style={{ padding: '2rem 1.5rem', maxWidth: '32rem', margin: '0 auto', width: '100%', flex: 1 }}>
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                backgroundColor: 'var(--color-primary-transparent)',
                                color: 'var(--color-primary)',
                                borderRadius: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.25rem'
                            }}>
                                <Bookmark size={32} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>Print Magazine</h2>
                            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.75rem', fontSize: '1rem', lineHeight: 1.5 }}>
                                Subscribe to receive our high-quality print magazine delivered to your doorstep.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleSubscribe('mag_5yr', '5 Year Subscription', 500)}
                                style={{
                                    padding: '1.5rem',
                                    backgroundColor: 'var(--color-card)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '1.25rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>5 Year Subscription</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>60 Issues included</div>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)' }}>₹500</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleSubscribe('mag_lifetime', 'Lifetime Subscription', 1000)}
                                style={{
                                    padding: '1.5rem',
                                    backgroundColor: 'var(--color-card)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '1.25rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>Lifetime Subscription</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Unlimited Issues</div>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)' }}>₹1000</span>
                            </motion.button>
                        </div>

                        <button
                            onClick={() => setShowSubscriptionOptions(false)}
                            style={{
                                width: '100%',
                                marginTop: '2.5rem',
                                padding: '1rem',
                                backgroundColor: 'transparent',
                                color: 'var(--color-text-muted)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel and Go Back
                        </button>
                    </div>
                </motion.div>
            ) : (
                <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={authLoading}
                            onClick={() => setShowSubscriptionOptions(true)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                backgroundColor: 'var(--color-primary)',
                                color: 'white',
                                borderRadius: '0.75rem',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '1rem',
                                boxShadow: 'var(--shadow-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: authLoading ? 'wait' : 'pointer'
                            }}
                        >
                            {authLoading ? 'Signing in...' : 'Subscribe Print Magazine'}
                        </motion.button>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '2rem',
                        marginBottom: '1.5rem',
                        borderBottom: '1px solid var(--color-border)',
                        padding: '0 1rem'
                    }}>
                        {['browse', 'subscriptions'].map(tab => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={async () => {
                                        if (tab === 'subscriptions') {
                                            if (await ensureAuth()) {
                                                setActiveTab(tab);
                                                setSearchParams({ tab });
                                            }
                                        } else {
                                            setActiveTab(tab);
                                            setSearchParams({ tab });
                                        }
                                    }}
                                    style={{
                                        padding: '0.75rem 0.25rem',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'color 0.2s',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {tab === 'browse' ? 'Browse' : 'My Subscriptions'}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabUnderline"
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: '3px',
                                                backgroundColor: 'var(--color-primary)',
                                                borderRadius: '99px'
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {activeTab === 'browse' ? (
                        <>
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
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {(!auth.currentUser || auth.currentUser.isAnonymous) ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    backgroundColor: 'var(--color-card)',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{
                                        backgroundColor: 'var(--color-primary-transparent)',
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 1rem'
                                    }}>
                                        <LogIn size={32} color="var(--color-primary)" />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Sign In Required</h3>
                                    <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1.5rem', fontSize: '0.875rem' }}>
                                        Sign in to view your magazine subscriptions and tracking status.
                                    </p>
                                    <button
                                        onClick={ensureAuth}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Sign In with Google
                                    </button>
                                </div>
                            ) : subsLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading subscriptions...</div>
                            ) : subscriptions.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: 'var(--color-text-muted)',
                                    backgroundColor: 'var(--color-card)',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <Bookmark size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                    <p>No active subscriptions found.</p>
                                    <button
                                        onClick={() => setActiveTab('browse')}
                                        style={{
                                            color: 'var(--color-primary)',
                                            background: 'none',
                                            border: 'none',
                                            fontWeight: 600,
                                            marginTop: '0.5rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Browse Magazine Instead
                                    </button>
                                </div>
                            ) : (
                                subscriptions.map(sub => (
                                    <div key={sub.id} style={{
                                        backgroundColor: 'var(--color-card)',
                                        padding: '1rem',
                                        borderRadius: '1rem',
                                        border: '1px solid var(--color-border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h4 style={{ margin: 0, fontWeight: 700 }}>{sub.orderItems?.[0]?.title || 'Print Magazine Subscription'}</h4>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '9999px',
                                                backgroundColor: sub.status === 'COMPLETED' ? 'var(--color-success-transparent)' : 'var(--color-warning-transparent)',
                                                color: sub.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-warning)'
                                            }}>
                                                {sub.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            Registered on: {new Date(sub.timestamp?.seconds * 1000).toLocaleDateString()}
                                        </div>
                                        {sub.shippingAddress && (
                                            <div style={{
                                                marginTop: '0.5rem',
                                                padding: '0.75rem',
                                                backgroundColor: 'var(--color-surface)',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.8125rem'
                                            }}>
                                                <strong>Shipping to:</strong><br />
                                                {sub.shippingAddress.name}<br />
                                                {sub.shippingAddress.address}, {sub.shippingAddress.city} - {sub.shippingAddress.pincode}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MonthlyMagazine;
