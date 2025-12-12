import React from 'react';
import { motion } from 'framer-motion';
import { Send, Youtube } from 'lucide-react';
import BackButton from '../components/BackButton';

const LinkButton = ({ title, icon: Icon, url, delay }) => {
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, backgroundColor: 'var(--color-secondary)' }}
      whileTap={{ scale: 0.98 }}
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
        cursor: 'pointer',
        textDecoration: 'none'
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
        <Icon size={24} color="var(--color-primary)" />
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
    </motion.a>
  );
};

const Conversations = () => {
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
          {/* ✅ Title retained like other pages */}
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '2rem',
              textAlign: 'center'
            }}
          >
            Conversations
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <LinkButton
              title="Telegram"
              icon={Send}
              url="https://t.me/Bagavath_conversations"
              delay={0.1}
            />

            <LinkButton
              title="YouTube"
              icon={Youtube}
              url="https://youtube.com/@bagavathpathai?si=F2JEXlLNpDngYujc"
              delay={0.2}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Conversations;
