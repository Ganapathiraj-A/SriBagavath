import React from 'react';

const SkeletonScreen = () => {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f9fafb',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header Skeleton */}
            <div style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #d97706 100%)',
                padding: '2rem 1rem',
                textAlign: 'center'
            }}>
                <div style={{
                    height: '32px',
                    width: '200px',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    margin: '0 auto',
                    animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                <div style={{
                    height: '20px',
                    width: '120px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    margin: '12px auto 0',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    animationDelay: '0.1s'
                }} />
            </div>

            {/* Menu Buttons Skeleton */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div
                        key={i}
                        style={{
                            height: '70px',
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            border: '1px solid #f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '1rem',
                            gap: '1rem',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.05}s`
                        }}
                    >
                        {/* Icon placeholder */}
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#f3f4f6'
                        }} />
                        {/* Text placeholder */}
                        <div style={{
                            height: '20px',
                            flex: 1,
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            maxWidth: '150px'
                        }} />
                    </div>
                ))}
            </div>

            {/* Footer Skeleton */}
            <div style={{
                textAlign: 'center',
                padding: '20px'
            }}>
                <div style={{
                    height: '16px',
                    width: '80px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    margin: '0 auto',
                    animation: 'pulse 1.5s ease-in-out infinite'
                }} />
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
