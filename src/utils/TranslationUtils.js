import { db } from '@/firebase';
import { doc, getDoc, setDoc } from '@/utils/FirestoreProxy';

/**
 * Learned translation system for cities and frequent terms.
 * Stores mappings in 'learned_translations/cities' document.
 */
export const TranslationUtils = {
    /**
     * Get learned Tamil translation for a city
     */
    async getLearnedCity(englishCity) {
        if (!englishCity) return '';
        try {
            const docRef = doc(db, 'learned_translations', 'cities');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                const normalizedKey = englishCity.trim().toLowerCase();
                // Try direct match, then try with legacy trailing space
                return data[normalizedKey] || data[normalizedKey + ' '] || '';
            }
        } catch (err) {
            console.warn('Error fetching learned city:', err);
        }
        return '';
    },

    /**
     * Save/Update learned Tamil translation for a city
     */
    async saveLearnedCity(englishCity, tamilCity) {
        if (!englishCity || !tamilCity) return;
        try {
            await setDoc(doc(db, 'learned_translations', 'cities'), {
                [englishCity.trim().toLowerCase()]: tamilCity.trim()
            }, { merge: true });
        } catch (err) {
            console.warn('Error saving learned city:', err);
        }
    }
};
