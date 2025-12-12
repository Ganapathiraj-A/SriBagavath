import React from 'react';
import { motion } from 'framer-motion';
import { Headphones } from 'lucide-react';
import BackButton from '../components/BackButton';
import { useDriveFiles } from '../hooks/useDriveFiles';

// Audio Book folder:
// https://drive.google.com/drive/folders/1L65ifCQ_bAQauymMH5JyDgul7LIL3cnL
const AUDIO_BOOKS_FOLDER_ID = '1L65ifCQ_bAQauymMH5JyDgul7LIL3cnL';

const AudioBooks = () => {
  const { files, loading, error } = useDriveFiles(AUDIO_BOOKS_FOLDER_ID);

  const renderAudioLinks = () => {
    if (loading) {
      return (
        <div
          style={{
            marginTop: '1rem',
            color: '#4b5563',
            fontSize: '0.875rem'
          }}
        >
          Loading audio books…
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

    if (!files.length) {
      return (
        <div
          style={{
            marginTop: '1rem',
            color: '#4b5563',
            fontSize: '0.875rem'
          }}
        >
          No audio books found in the configured folder.
        </div>
      );
    }

    return (
      <div
        style={{
          marginTop: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
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
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Headphones size={18} style={{ flexShrink: 0 }} />
              <span>{file.name}</span>
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
        <BackButton />

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
            Audio Books
          </h1>

          {renderAudioLinks()}
        </motion.div>
      </div>
    </div>
  );
};

export default AudioBooks;
