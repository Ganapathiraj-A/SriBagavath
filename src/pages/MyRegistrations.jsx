import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { TransactionService } from '../services/TransactionService';
import '../components/RegistrationStyles.css';

const MyRegistrations = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = TransactionService.streamUserTransactions((data) => {
            setHistory(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'BNK_VERIFIED': return 'green'; // Green for Verified
            case 'REGISTERED': return 'green';
            case 'PENDING': return 'orange';
            case 'REJECTED': return 'red';
            default: return 'gray';
        }
    };

    const formatDate = (ts) => {
        if (!ts) return "";
        // Handle Firestore Timestamp or Date
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString();
    };

    return (
        <div className="payment-container screen-wrapper">
            <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* <button className="btn-text" style={{ margin: 0 }} onClick={() => navigate(-1)}>
                    <ChevronLeft />
                </button> */}
                <h1 style={{ margin: 0 }}>My Registrations</h1>
            </header>

            <div className="product-list" style={{ marginTop: '16px' }}>
                {loading && <p>Loading...</p>}
                {!loading && history.length === 0 && <p>No transactions found.</p>}

                {history.map(tx => (
                    <div key={tx.id} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>{tx.itemName}</h3>
                            <span style={{
                                color: getStatusColor(tx.status),
                                fontWeight: 'bold',
                                fontSize: '12px',
                                background: '#f3f4f6',
                                padding: '2px 8px',
                                borderRadius: '12px'
                            }}>
                                {tx.status === 'BNK_VERIFIED' ? 'CONFIRMED' : tx.status}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#666' }}>
                            <span>{formatDate(tx.timestamp)}</span>
                            <span style={{ fontWeight: 'bold' }}>₹{tx.amount}</span>
                        </div>
                        {/* Show Participant count if available */}
                        {tx.participantCount && (
                            <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                                Participants: {tx.participantCount}
                            </div>
                        )}

                        {/* Participants List */}
                        {tx.participants && tx.participants.length > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '13px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                <strong>Participant Details:</strong>
                                {tx.participants.map((p, idx) => (
                                    <div key={idx} style={{ marginLeft: '8px' }}>
                                        {idx + 1}. {p.name} ({p.gender}, {p.age}) - {p.accommodation}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tx.ocrText}
                        </div>

                        {/* Link to Program Details */}
                        {tx.programId && (
                            <button
                                className="btn-secondary"
                                onClick={() => navigate(`/programs?id=${tx.programId}`)}
                                style={{ marginTop: '12px', width: '100%', fontSize: '14px', padding: '8px' }}
                            >
                                View Program Details
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyRegistrations;
