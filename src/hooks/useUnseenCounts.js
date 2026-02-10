// src/hooks/useUnseenCounts.js
import { useNotifications } from '../context/NotificationContext';

export const useUnseenCounts = () => {
    const counts = useNotifications();
    return counts;
};
