import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.log("!!! APP_CRASH_DETECTED !!!");
        console.log("Error: " + (error ? error.toString() : "Unknown"));
        console.log("Stack: " + (errorInfo ? errorInfo.componentStack : "No Stack"));
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fee2e2', color: '#b91c1c', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Something went wrong.</h1>
                    <details open style={{ whiteSpace: 'pre-wrap', textAlign: 'left', backgroundColor: 'white', padding: '1rem', borderRadius: '0.75rem', overflow: 'auto', maxWidth: '90vw', border: '1px solid #f87171', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '0.5rem', borderBottom: '1px solid #fee2e2', marginBottom: '0.5rem' }}>View Error Details</summary>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', lineHeight: '1.4', color: '#7f1d1d' }}>
                            <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#b91c1c' }}>{this.state.error && this.state.error.toString()}</strong>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>
                    </details>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', backgroundColor: '#b91c1c', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, transition: 'background-color 0.2s' }}
                    >
                        Return Home
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
