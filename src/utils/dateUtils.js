/**
 * Utility to consistently handle local dates across the application.
 * Avoids UTC-related discrepancies (e.g., new Date().toISOString() during early morning IST).
 */

/**
 * Returns the current local date in YYYY-MM-DD format.
 * @returns {string}
 */
export const getLocalDateString = (date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formats a given Date object or date string to local YYYY-MM-DD.
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatToLocalDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formats a Firestore timestamp or Date object to a local date string.
 * @param {any} ts 
 * @returns {string}
 */
export const formatDate = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString();
};
