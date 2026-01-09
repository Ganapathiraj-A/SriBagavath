/**
 * Utility to consistently handle local dates across the application.
 * Avoids UTC-related discrepancies (e.g., new Date().toISOString() during early morning IST).
 */

/**
 * Returns the current local date in YYYY-MM-DD format.
 * @returns {string}
 */
export const getLocalDateString = () => {
    // en-CA uses YYYY-MM-DD format
    return new Date().toLocaleDateString('en-CA');
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
