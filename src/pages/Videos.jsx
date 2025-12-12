import React from 'react';
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';
import BackButton from '../components/BackButton';

const Videos = () => {
    return (
        <div className="min-h-screen bg-surface p-6">
            <div className="max-w-2xl mx-auto">
                <BackButton />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-8 shadow-sm text-center"
                >
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                        <Video size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Videos</h1>
                    <p className="text-gray-600 mb-8">
                        Watch Bagavath Ayya's discourses. This section will feature a YouTube playlist.
                    </p>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500">
                        Integration Pending: YouTube Data API / Embed
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Videos;
