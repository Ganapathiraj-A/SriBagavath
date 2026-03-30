import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import ScreenTree from '@/components/ScreenTree';

const HideScreens = () => {
    const navigate = useNavigate();
    const { hiddenScreens, setHiddenScreens } = useGlobalSettings();
    const [activeTab, setActiveTab] = useState('Public');

    const tabs = ['Public', 'Admin', 'Dev'];

    // Define the full hierarchical list of manageable pages
    const publicPagesHierarchy = [
        { id: '/about', title: 'About Bagavath Ayya' },
        {
            id: '/programs', title: 'Programs Hub',
            children: [
                { id: '/programs/retreat', title: 'Retreats' },
                { id: '/schedule', title: "Ayya's Schedule" },
                { id: '/programs/online/daily', title: 'Daily Zoom Meeting' },
                { id: '/programs/online', title: 'Other Online Meetings' },
                { id: '/programs/satsang', title: 'Satsang' },
                { id: '/programs/consultation', title: 'Consultation' }
            ]
        },
        {
            id: '/books', title: 'Books & Media Hub',
            children: [
                { id: '/bookstore', title: 'Physical Books' },
                { id: '/digital-books', title: 'Digital Books' },
                { id: '/audio-books', title: 'Audio Books' },
                { id: '/conversations/recorded-programs', title: 'Recorded Programs' },
                { id: '/monthly-magazine', title: 'Monthly Magazine' },
                { id: '/videos', title: 'Related Videos' }
            ]
        },
        { id: '/donations', title: 'Donations' },
        { id: '/gallery', title: 'Gallery' },
        { id: '/contact', title: 'Contact' }
    ];

    const adminPagesHierarchy = [
        { id: '/admin-review', title: 'Registration Hub', nonHiddable: true },
        { id: '/admin/purchases', title: 'Purchases Hub', nonHiddable: true },
        { id: '/admin/donations', title: 'Donations Hub', nonHiddable: true },
        {
            id: '/admin/back-office', title: 'Back Office Hub', nonHiddable: true,
            children: [
                { id: '/admin/back-office/programs', title: 'Attendance Tracking' },
                { id: '/admin/back-office/reconciliation', title: 'Bank Reconciliation' },
                { id: '/admin/back-office/reporting', title: 'Reporting & Analytics' },
                { id: '/admin/back-office/import-export', title: 'Import / Export Data' },
                { id: '/admin/back-office/offline-registration', title: 'Program Registration' },
                { id: '/admin/back-office/offline-books', title: 'Book Purchase' },
                { id: '/admin/back-office/offline-donation', title: 'Donation Entry' }
            ]
        },
        {
            id: '/admin/page-user-management', title: 'Page & User Mgmt', nonHiddable: true,
            children: [
                {
                    id: '/admin/program-management', title: 'Program Management',
                    children: [
                        { id: '/program', title: 'Retreats' },
                        { id: '/admin/online-meetings', title: 'Online Meetings' },
                        { id: '/admin/satsang', title: 'Satsangs' },
                        { id: '/configuration/program-types', title: 'Program Types' },
                        { id: '/admin/daily-zoom', title: 'Daily Zoom' },
                        { id: '/admin/consultation', title: 'Consultation' },
                        { id: '/schedule/manage', title: 'Schedules' }
                    ]
                },
                {
                    id: '/admin/books-media', title: 'Books & Media Management',
                    children: [
                        { id: '/admin/books', title: 'Book Management' },
                        { id: '/admin/digital-books-settings', title: 'Digital Books Languages' },
                        { id: '/admin/related-videos', title: 'Related Videos' },
                        { id: '/admin/gallery', title: 'Gallery Management' }
                    ]
                },
                { id: '/manage-users', title: 'Manage Admins' }
                // Hide Pages is omitted
            ]
        },
        {
            id: '/admin/settings', title: 'App Settings Hub', nonHiddable: true,
            children: [
                { id: '/admin/personal-profile', title: 'Personal Settings' },
                { id: '/admin/cloud-settings', title: 'Cloud Global Settings' },
                { id: '/admin/analytics-system', title: 'Analytics & Tools' }
            ]
        }
    ];

    const getPagesForTab = (tab) => {
        if (tab === 'Public') return publicPagesHierarchy;
        return adminPagesHierarchy; // Admin and Dev share the same comprehensive list
    };

    const currentHiddenArray = hiddenScreens[activeTab.toLowerCase()] || [];

    const handleToggle = (node, isTargetHidden) => {
        const tabKey = activeTab.toLowerCase();
        let newHiddenArray = [...(hiddenScreens[tabKey] || [])];

        // Gather all IDs starting from this node downwards
        const gatherIds = (n, acc = []) => {
            acc.push(n.id);
            if (n.children) {
                n.children.forEach(child => gatherIds(child, acc));
            }
            return acc;
        };

        const idsToToggle = gatherIds(node);

        if (!isTargetHidden) {
            // Un-hide: Remove all these IDs from the array
            newHiddenArray = newHiddenArray.filter(id => !idsToToggle.includes(id));
        } else {
            // Hide: Add all these IDs to the array, ensuring uniqueness
            idsToToggle.forEach(id => {
                if (!newHiddenArray.includes(id)) {
                    newHiddenArray.push(id);
                }
            });
        }

        const newHiddenScreens = {
            ...hiddenScreens,
            [tabKey]: newHiddenArray
        };

        setHiddenScreens(newHiddenScreens);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
            <PageHeader
                title="Hide Pages"
                leftAction={
                    <button onClick={() => navigate('/admin/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            {/* Line Style Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1,
                            padding: '1rem 0',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9375rem',
                            fontWeight: activeTab === tab ? 600 : 500,
                            color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            position: 'relative'
                        }}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                style={{
                                    position: 'absolute',
                                    bottom: -1, /* Align indicator over bottom border */
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    backgroundColor: 'var(--color-primary)'
                                }}
                            />
                        )}
                    </button>
                ))}
            </div>

            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                    {activeTab} Screens Visibility
                </h3>
                
                <ScreenTree 
                    data={getPagesForTab(activeTab)} 
                    hiddenArray={currentHiddenArray} 
                    onToggle={handleToggle} 
                />
                
                <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    Hidden screens will not appear in the navigation menus for {activeTab} users. Note that this only hides the UI links, it does not remove route access entirely.
                </p>
            </div>
        </div>
    );
};

export default HideScreens;
