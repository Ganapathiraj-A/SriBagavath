import React from 'react';

const SkeletonScreen = () => {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2.5rem 1rem'
        }}>
            {/* Profile Image Skeleton */}
            <div style={{
                width: '8rem',
                height: '8rem',
                borderRadius: '9999px',
                backgroundColor: '#e5e7eb',
                marginBottom: '1.5rem',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                border: '4px solid white',
                animation: 'pulse 1.5s ease-in-out infinite'
            }} />

            {/* Title & Subtitle Skeletons */}
            <div style={{
                height: '24px',
                width: '180px',
                backgroundColor: '#e5e7eb',
                borderRadius: '6px',
                marginBottom: '0.5rem',
                animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
                height: '16px',
                width: '140px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                marginBottom: '2.5rem',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: '0.1s'
            }} />

            {/* Menu Buttons Skeleton */}
            <div style={{
                width: '100%',
                maxWidth: '28rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div
                        key={i}
                        style={{
                            height: '74px',
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            border: '1px solid #f3f4f6',
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '1rem',
                            gap: '1rem',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.1}s`
                        }}
                    >
                        {/* Icon placeholder */}
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '9999px',
                            backgroundColor: '#fff7ed'
                        }} />
                        {/* Text placeholder */}
                        <div style={{
                            height: '18px',
                            width: '120px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px'
                        }} />
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default SkeletonScreen;
