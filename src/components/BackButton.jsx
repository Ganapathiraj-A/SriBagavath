import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const BackButton = () => {
    const navigate = useNavigate();

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-primary-dark font-medium hover:bg-surface rounded-lg transition-colors mb-6"
        >
            <ArrowLeft size={20} />
            <span>Back</span>
        </motion.button>
    );
};

export default BackButton;
