import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const PageHeader = ({
    title,
    showBack = true,
    rightAction = null,
    bgColor = 'white',
    textColor = '#111827'
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Don't show back button on Home
    const canGoBack = showBack && location.pathname !== '/';

    return (
        <div style={{
            position: 'relative', // Not sticky anymore
            zIndex: 50,
            backgroundColor: 'transparent', // Transparent to blend with page
            color: textColor,
            // Header spacing similar to Books screen padding
            paddingTop: '24px',
            paddingBottom: '24px',
            paddingLeft: '16px',
            paddingRight: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
        }}>
            {/* Left: Back Button - Removed per user request */}
            {/* {canGoBack && ( ... )} */}

            {/* Center: Title */}
            <h1 style={{
                fontSize: '1.5rem', // Match Books-ish size (Books is 1.875rem, but 1.5 is safer for mobile headers)
                fontWeight: 'bold', // Match Books weight
                margin: 0,
                textAlign: 'center',
                color: '#111827', // Dark gray
                maxWidth: '70%',
                lineHeight: 1.2
            }}>
                {title}
            </h1>

            {/* Right: Action */}
            {rightAction && (
                <div style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                </div>
            )}
        </div>
    );
};

export default PageHeader;
