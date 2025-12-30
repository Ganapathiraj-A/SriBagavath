import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useDriveFiles } from '../hooks/useDriveFiles';
import { DRIVE_CONFIG } from '../data/driveConfig';

const { ENGLISH_BOOKS_FOLDER_ID, TAMIL_BOOKS_FOLDER_ID } = DRIVE_CONFIG;

const PdfBooks = () => {
  const tabs = ['Tamil Books', 'English Books'];
  const [activeTab, setActiveTab] = useState('Tamil Books');

  const englishData = useDriveFiles(ENGLISH_BOOKS_FOLDER_ID);
  const tamilData = useDriveFiles(TAMIL_BOOKS_FOLDER_ID);

  const current = activeTab === 'English Books' ? englishData : tamilData;

  const renderPdfLinks = () => {
    const { files, loading, error } = current;

    if (loading) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <p>Loading books...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
          <p>{error}</p>
        </div>
      );
    }

    if (files.length === 0) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
          <p>No books available in this category.</p>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {files.map((file) => {
          const viewUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
          return (
            <motion.a
              key={file.id}
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                textDecoration: 'none',
                color: '#111827',
                transition: 'transform 0.2s ease'
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '1rem', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
              </div>
              <BookOpen size={18} color="#9ca3af" />
            </motion.a>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '30px' }}>
      <PageHeader title="Digital Books" />

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        margin: '0 16px',
        borderBottom: '1px solid #e5e7eb',
        gap: '20px',
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 4px',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab ? 'var(--color-primary)' : '#6b7280',
              fontWeight: activeTab === tab ? '600' : '500',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '30rem', margin: '0 auto' }}>
        {renderPdfLinks()}
      </div>
    </div>
  );
};

export default PdfBooks;
