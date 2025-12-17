import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useDriveFiles } from '../hooks/useDriveFiles';

import { DRIVE_CONFIG } from '../data/driveConfig';

const { ENGLISH_BOOKS_FOLDER_ID, TAMIL_BOOKS_FOLDER_ID } = DRIVE_CONFIG;

/* ==== Reused Button Style from Books Page ==== */
const LanguageButton = ({ title, onClick, delay }) => {
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
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        border: '1px solid #f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '1rem',
        textAlign: 'left',
        cursor: 'pointer'
      }}
    >
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '9999px',
          backgroundColor: '#fff7ed',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <BookOpen size={24} color="var(--color-primary)" />
      </div>

      <span
        style={{
          fontSize: '1.125rem',
          fontWeight: 500,
          color: '#1f2937'
        }}
      >
        {title}
      </span>
    </motion.button>
  );
};

const PdfBooks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLanguage = searchParams.get('lang');

  const english = useDriveFiles(ENGLISH_BOOKS_FOLDER_ID);
  const tamil = useDriveFiles(TAMIL_BOOKS_FOLDER_ID);

  const current =
    selectedLanguage === 'english'
      ? english
      : selectedLanguage === 'tamil'
        ? tamil
        : null;

  const renderPdfLinks = () => {
    if (!current) return null;

    const { files, loading, error } = current;

    if (loading) {
      return (
        <div style={{ marginTop: '1rem', color: '#4b5563', fontSize: '0.875rem' }}>
          Loading books…
        </div>
      );
    }

    if (error) {
      return (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            color: '#b91c1c',
            fontSize: '0.875rem'
          }}
        >
          {error}
        </div>
      );
    }

    return (
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {files.map((file) => {
          const viewUrl =
            file.webViewLink ||
            `https://drive.google.com/file/d/${file.id}/view`;

          return (
            <a
              key={file.id}
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#1f2937',
                textDecoration: 'none'
              }}
            >
              {file.name}
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-surface)',
        padding: '1.5rem'
      }}
    >
      <div style={{ maxWidth: '28rem', margin: '0 auto' }}>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
          }}
        >
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '2rem',
              textAlign: 'center'
            }}
          >
            PDF Books
          </h1>

          {/* Initial View – Two Buttons */}
          {!selectedLanguage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <LanguageButton
                title="English"
                delay={0.1}
                onClick={() => setSearchParams({ lang: 'english' })}
              />
              <LanguageButton
                title="Tamil"
                delay={0.2}
                onClick={() => setSearchParams({ lang: 'tamil' })}
              />
            </div>
          )}

          {/* After Language Selection – Show PDFs */}
          {selectedLanguage && (
            <>
              <motion.button
                onClick={() => setSearchParams({})}
                whileTap={{ scale: 0.98 }}
                style={{
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: 'var(--color-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ← Back to language selection
              </motion.button>

              {renderPdfLinks()}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PdfBooks;
