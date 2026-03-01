/**
 * Utility to consistently handle local dates across the application.
 * Avoids UTC-related discrepancies (e.g., new Date().toISOString() during early morning IST).
 */

/**
 * Returns the current local date in YYYY-MM-DD format.
 * @returns {string}
 */
export const getLocalDateString = (date = new Date()) => {
    // en-CA uses YYYY-MM-DD format
    return new Date(date).toLocaleDateString('en-CA');
};

/**
 * Formats a given Date object or date string to local YYYY-MM-DD.
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatToLocalDateString = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-CA');
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
